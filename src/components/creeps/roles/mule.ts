import CreepAction, {ICreepAction} from "../creepAction";

export interface IMule {
	isBagEmpty(): boolean;
	action(): boolean;
}

export default class Mule extends CreepAction implements IMule, ICreepAction {

	public scanForDrops: boolean = false;
	public storage: StructureStorage;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.storage = this.creep.room.storage || undefined;
	}

	public isBagEmpty(): boolean {
		return (_.sum(this.creep.carry) === 0);
	}

	public isBagFull(): boolean {
		return (_.sum(this.creep.carry) === this.creep.carryCapacity);
	}

	public getTargetList(blackList: string[] = []): Structure[] {
		return this.creep.room.myStructures.filter((structure: EnergyStructure) => (
			blackList.indexOf(structure.id) === -1 && (
				(structure.structureType === STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity)
				|| (structure.structureType === STRUCTURE_TOWER && structure.energy < (structure.energyCapacity * 0.75))
				|| (structure.structureType === STRUCTURE_SPAWN && structure.energy < (structure.energyCapacity * 0.85))
			)
		));
	}
	public scanForTargets(blackList: string[] = []): Structure {
		if (this.creep.room.myStructures.length > 0) {
			let structs = this.getTargetList(blackList);
			let target: EnergyStructure = this.creep.pos.findClosestByPath(structs, {
				algorithm: "astar",
				maxRooms: 1,
				maxOps: 500,
				costCallback: this.roomCallback,
			}) as EnergyStructure;
			if (!!target) {
				let taken: Creep[] = this.creep.room.myCreeps.filter((c: Creep) => c.name !== this.creep.name
				&& c.memory.role.toUpperCase() === this.creep.memory.role.toUpperCase()
				&& (!!c.memory.target && c.memory.target === target.id));
				if (!!taken && taken.length > 0) {
					blackList.push(target.id);
					return this.scanForTargets(blackList);
				} else {
					return target;
				}
			}
		}
		return undefined;
	};

	public dumpRoutine(target: Structure): void {
		let status: number;
		if (!this.creep.pos.isNearTo(target)) {
			this.creep.memory.target = target.id;
			this.moveTo(target.pos);
		} else {
			switch (target.structureType) {
				case STRUCTURE_EXTENSION:
				case STRUCTURE_SPAWN:
				case STRUCTURE_TOWER:
				case STRUCTURE_LINK:
					status = this.creep.transfer(target, RESOURCE_ENERGY);
					break;
				case STRUCTURE_CONTAINER:
				case STRUCTURE_STORAGE:
					if (this.creep.carry.energy > 0) {
						status = this.creep.transfer(target, RESOURCE_ENERGY);
					} else {
						this.creep.memory.mineralType = this.getMineralTypeFromStore(this.creep);
						status = this.creep.transfer(target, this.creep.memory.mineralType);
					}
					break;
				default:
					console.log(`Unhandled Structure in RoleMule.dumpRoutine: ${target.structureType} on target ${target}`);
			}
			switch (status) {
				case ERR_FULL:
				case ERR_NOT_ENOUGH_RESOURCES:
				case OK:
					delete this.creep.memory.target;
					break;
				default:
					console.log(`Status ${status} not defined for RoleMule.dump`);
			}
		}
	};
	public dumpAtStorage(): void {
		if (!this.creep.memory.target) {
			// find a link that's closer than storage
			if (!!this.storage && this.creep.carry.energy > 0) {
				let storageRange = this.creep.pos.getRangeTo(this.storage.pos);
				let target: OwnedStructure = this.creep.pos.findClosestByRange<OwnedStructure>(
					this.creep.room.myStructures.filter((s: OwnedStructure) => s.structureType === STRUCTURE_LINK && s.pos.getRangeTo(this.creep.pos) < storageRange)
				);
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					this.creep.memory.target = this.storage.id;
				}
			} else if (!!this.storage) {
				this.creep.memory.target = this.storage.id;
			} else {
				// last resort; just return energy to the nearest container.
				let target: StructureContainer = this.creep.pos.findClosestByPath(this.creep.room.containers, {
					filter: (structure: StructureContainer) => _.sum(structure.store) < structure.storeCapacity,
					costCallback: this.roomCallback,
				}) as StructureContainer;
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					delete this.creep.memory.target;
					this.creep.say("IDLE!");
				}
			}
		}
		let target: Structure = Game.getObjectById(this.creep.memory.target) as Structure;
		if (!target) {
			delete this.creep.memory.target;
		} else {
			this.dumpRoutine(target);
		}
	};

	public setSource(idle: boolean = false, blackList: string[] = [], retry: boolean = false): void {
		// Get energy from containers
		let structs = this.creep.room.containers.filter((structure: StructureContainer) =>
		blackList.indexOf(structure.id) === -1 && structure.structureType === STRUCTURE_CONTAINER
		&& structure.store[RESOURCE_ENERGY] >= (this.creep.carryCapacity - _.sum(this.creep.carry)));
		let source: StructureContainer = this.creep.pos.findClosestByPath(structs, {
			algorithm: "astar",
			maxRooms: 1,
			maxOps: 500,
			costCallback: this.roomCallback,
		}) as StructureContainer;
		if (!source && idle && this.creep.room.controller.level > 5) {
			// No energy in containers found. Get some minerals instead
			structs = this.creep.room.containers.filter((structure: StructureContainer) =>
			blackList.indexOf(structure.id) === -1 && structure.structureType === STRUCTURE_CONTAINER
			&& _.sum(structure.store) >= (this.creep.carryCapacity - _.sum(this.creep.carry)) / 2);
			source = this.creep.pos.findClosestByPath(structs, {
				algorithm: "astar",
				maxRooms: 1,
				maxOps: 500,
				costCallback: this.roomCallback,
			}) as StructureContainer;
			if (!!source) {
				this.creep.memory.mineralType = this.getMineralTypeFromStore(source);
			}
		} else {
			// We're hauling energy. Unset the mineral type.
			this.creep.memory.mineralType = RESOURCE_ENERGY;
		}
		if (!!source) {
			let taken: Creep[] = this.creep.room.myCreeps.filter((c: Creep) => c.name !== this.creep.name
				&& c.memory.role.toUpperCase() === this.creep.memory.role.toUpperCase()
				&& (!!c.memory.source && c.memory.source === source.id));
			if (!!taken && taken.length > 0) {
				blackList.push(source.id);
				this.setSource(idle, blackList);
			} else {
				this.creep.memory.source = source.id;
			}
		} else if (!!this.creep.room.storage && this.creep.room.storage.store[RESOURCE_ENERGY] > 0) {
			if (!idle) { // Only collect from the storage if we have targets that require energy.
				this.creep.memory.source = this.creep.room.storage.id;
				this.creep.memory.mineralType = RESOURCE_ENERGY;
			} else if (!retry) {
				this.setSource(true, blackList, true);
			}
		}
	}

	public muleLogic(): void {
		if (!!this.creep.memory.dumping && this.isBagEmpty()) {
			delete this.creep.memory.dumping;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.idle;
			this.creep.say("M:COL");
		}
		if (!this.creep.memory.dumping && !this.creep.memory.idle && this.isBagFull()) {
			this.creep.memory.dumping = true;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.idle;
			this.creep.say("M:DIST");
		}
		if (!!this.creep.memory.dumping) {
			if (!this.creep.memory.target && this.creep.carry.energy > 0) {
				let target = this.scanForTargets();
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					// nothing to mule. do secondary tasks instead.
					this.creep.memory.idle = true;
					delete this.creep.memory.dumping;
					delete this.creep.memory.target;
					delete this.creep.memory.source;
				}
			} else if (!this.creep.memory.target && this.creep.carry.energy === 0) {
					this.creep.memory.target = this.creep.room.storage.id;
					this.creep.memory.mineralType = this.getMineralTypeFromStore(this.creep);
			}
			let target: Structure = Game.getObjectById(this.creep.memory.target) as Structure;
			if (!target) {
				delete this.creep.memory.target;
			} else {
				this.dumpRoutine(target);
			}
		} else if (!!this.creep.memory.idle) {
			if (_.sum(this.creep.carry) - this.creep.carry.energy > 0) {
				// We're carrying Minerals. Drop them off first before returning to duty.
				this.dumpAtStorage();
			} else {
				// return to duty when able
				let target: Structure = undefined;
				if (Game.time % 5 === 0) {
					target = this.scanForTargets();
				}
				if (!!target) {
					this.creep.memory.target = target.id;
					delete this.creep.memory.idle;
					this.creep.memory.dumping = true;
					this.muleLogic();
				} else {
					// scan for dropped energy if we have room
					if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
						let target: Resource;
						if (this.scanForDrops) {
							let resources = this.creep.room.find(FIND_DROPPED_RESOURCES, {filter: (r: Resource) => r.amount > 100});
							if (resources.length > 0) {
								target = this.creep.pos.findClosestByPath(resources, {
									algorithm: "astar",
									maxRooms: 1,
									maxOps: 500,
									costCallback: this.roomCallback,
								}) as Resource;
							}
						}
						if (!!target) {
							if (!this.creep.pos.isNearTo(target)) {
								this.moveTo(target.pos);
							} else {
								this.creep.pickup(target);
							}
						} else {
							if (!this.creep.memory.source) {
								this.setSource(true);
							}
							if (!!this.creep.memory.source) {
								let source = Game.getObjectById(this.creep.memory.source);
								if (!!source && source instanceof Structure) { // Sources aren't structures
									this.collectFromSource(source);
								} else {
									delete this.creep.memory.source;
									delete this.creep.memory.mineralType;
								}
							} else if (_.sum(this.creep.carry) > 0) {
								// No sources found, proceed to offload at Storage.
								this.dumpAtStorage();
							} else {
								let flag = Game.flags[this.creep.room.name];
								if (!!flag && flag.room.name === this.creep.room.name) {
									this.moveTo(flag.pos);
								}
							}
						}
					} else {
						// We're full. Go dump at a Storage.
						this.dumpAtStorage();
					}
				}
			}
		} else {
			if (!this.creep.memory.source) {
				this.setSource();
			}
			if (!!this.creep.memory.source) {
				let source = Game.getObjectById(this.creep.memory.source);
				if (source instanceof Structure) { // Sources aren't structures
					this.collectFromSource(source);
				} else {
					delete this.creep.memory.source;
					delete this.creep.memory.mineralType;
				}
			} else {
				// no more sources. start dumping
				if (this.creep.carry.energy > 0) {
					this.creep.memory.dumping = true;
				} else {
					this.creep.say("DRY");
					let target: Resource;
					if (this.scanForDrops) {
						let resources = this.creep.room.find(FIND_DROPPED_RESOURCES, {filter: (r: Resource) => r.amount > 100});
						if (resources.length > 0) {
							target = this.creep.pos.findClosestByPath(resources, {
								algorithm: "astar",
								maxRooms: 1,
								maxOps: 500,
								costCallback: this.roomCallback,
							}) as Resource;
						}
					}
					if (!!target) {
						if (!this.creep.pos.isNearTo(target)) {
							this.moveTo(target.pos);
						} else {
							this.creep.pickup(target);
						}
					} else {
						let flag = Game.flags[this.creep.room.name];
						if (!!flag && flag.room.name === this.creep.room.name) {
							this.moveTo(flag.pos);
						}
					}
				}
			}
		}
	};

	public collectFromSource(source: Structure) {
		if (!this.creep.pos.isNearTo(source)) {
			this.creep.memory.source = source.id;
			this.moveTo(source.pos);
		} else {
			if (!this.creep.memory.mineralType) {
				this.creep.memory.mineralType = RESOURCE_ENERGY;
			}
			let drops = source.pos.lookFor(LOOK_RESOURCES);
			if (drops.length > 0) {
				_.forEach(drops, (drop: Resource) => {
					this.creep.pickup(drop);
				});
			} else {
				let status = this.creep.withdraw(source, this.creep.memory.mineralType);
				switch (status) {
					case ERR_NOT_ENOUGH_RESOURCES:
					case ERR_INVALID_TARGET:
					case ERR_NOT_OWNER:
						delete this.creep.memory.source;
						this.setSource();
						break;
					case ERR_FULL:
					case OK:
						delete this.creep.memory.source;
						break;
					default:
						console.log(`Unhandled ERR in RoleMule.source.container: ${status}`);
				}
			}
		}
	}

	public pickupResourcesInRange(): void {
		if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
			let p = this.creep.pos;
			let targets = this.creep.room.lookForAtArea(LOOK_RESOURCES, p.y - 1, p.x - 1, p.y + 1, p.x + 1, true) as LookAtResultWithPos[];
			if (targets.length > 0) {
				_.each(targets, function (t) {
					if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
						this.creep.pickup(t.resource);
					}
				}, this);
			} else {
				if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
					let containers = this.creep.room.containers.filter((s: StructureContainer) => s.structureType === STRUCTURE_CONTAINER
						&& _.sum(s.store) > 50
						&& s.pos.isNearTo(this.creep.pos)
					) as StructureContainer[];
					if (containers.length > 0) {
						let t = containers.shift();
						if (t.store.energy > 50) {
							this.creep.withdraw(t, RESOURCE_ENERGY);
						} else {
							let x: string = this.getMineralTypeFromStore(t);
							this.creep.withdraw(t, x);
						}
					}
				}
			}
		}
	};

	public action(): boolean {
		this.pickupResourcesInRange();
		this.muleLogic();
		return true;
	}
}
