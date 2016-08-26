import CreepAction, {ICreepAction} from "../creepAction";

export interface IMule {

	targetEnergyDropOff: Spawn | Structure;
	targetEnergySource: Spawn | Structure;

	isBagEmpty(): boolean;
	tryCollectEnergy(): number;
	moveToCollectEnergy(): void;
	assignNewTarget(): boolean;

	action(): boolean;
}

export default class Mule extends CreepAction implements IMule, ICreepAction {

	public targetEnergyDropOff: Spawn | Structure;
	public targetEnergySource: Spawn | Structure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);

		this.targetEnergyDropOff = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_dropoff_id);
		this.targetEnergySource = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_source_id);
	}

	public assignNewTarget(blackList: string[] = []): boolean {
		if (this.creep.room.myStructures.length > 0) {
			let structs: OwnedStructure[] = this.creep.room.myStructures.filter((structure: EnergyStructure) =>
				( blackList.indexOf(structure.id) === -1 &&
					(
						(structure.structureType === STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity)
						|| ((structure.structureType === STRUCTURE_TOWER || structure.structureType === STRUCTURE_SPAWN)
						&& structure.energy < (structure.energyCapacity * 0.8))
					)
				)
			);
			let target: EnergyStructure = <EnergyStructure> this.creep.pos.findClosestByRange(structs);
			if (!!target) {
				let taken = this.creep.room.myCreeps.filter((c: Creep) => c.name !== this.creep.name
				&& c.memory.role.toUpperCase() === this.creep.memory.role.toUpperCase()
				&& (!!c.memory.target && c.memory.target === target.id));
				if (!!taken && taken.length > 0) {
					blackList.push(target.id);
					return this.assignNewTarget(blackList);
				} else {
					this.targetEnergyDropOff = target;
					this.creep.memory.target_energy_dropoff_id = target.id;
					return true;
				}
			}
		}
		return false;
	}

	public isBagEmpty(): boolean {
		return (_.sum(this.creep.carry) === 0);
	}

	public moveToCollectEnergy(): void {
		if (!this.creep.pos.isNearTo(this.targetEnergySource.pos)) {
			this.moveTo(this.targetEnergySource.pos);
		} else {
			this.tryCollectEnergy();
		}
	}

	public tryCollectEnergy(): number {
		return this.creep.withdraw(this.targetEnergySource, RESOURCE_ENERGY);
	}

	public scanForTargets(blackList: string[] = []): Structure {
		if (this.creep.room.myStructures.length > 0) {
			let structs = this.creep.room.myStructures.filter((structure: EnergyStructure) => (
				blackList.indexOf(structure.id) === -1 && (
					(structure.structureType === STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity)
					|| (structure.structureType === STRUCTURE_TOWER && structure.energy < (structure.energyCapacity * 0.75))
					|| (structure.structureType === STRUCTURE_SPAWN && structure.energy < (structure.energyCapacity * 0.85))
				)
			));
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
					if (!(target instanceof StructureStorage) || _.sum(this.creep.carry) === 0) {
						delete this.creep.memory.target;
						// We're empty, drop from idle to pick up new stuff to haul.
						delete this.creep.memory.idle;
						this.muleLogic();
					}
					break;
				case OK:
					break;
				default:
					console.log(`Status ${status} not defined for RoleMule.dump`);
			}
		}
	};
	public dumpAtStorage(): void {
		if (!this.creep.memory.target) {
			// find a nearby link first, if storage isn't close
			if (!!this.creep.room.storage && this.creep.carry.energy > 0 && !this.creep.pos.inRangeTo(this.creep.room.storage.pos, 9)) {
				let target: StructureLink[] = this.creep.room.myStructures.filter((s: StructureLink) => s.structureType === STRUCTURE_LINK
					&& s.energy < s.energyCapacity
					&& s.pos.inRangeTo(this.creep.pos, 10)
				) as StructureLink[];
				if (!!target && target.length > 0) {
					this.creep.memory.target = target[0].id;
				} else {
					this.creep.memory.target = this.creep.room.storage.id;
				}
			} else if (!!this.creep.room.storage) {
				this.creep.memory.target = this.creep.room.storage.id;
			} else {
				// last resort; just return energy to the nearest container.
				let structs = this.creep.room.containers.filter((structure: StructureContainer) =>
				structure.structureType === STRUCTURE_CONTAINER && _.sum(structure.store) < structure.storeCapacity);
				let target: StructureContainer = this.creep.pos.findClosestByPath(structs, {
					algorithm: "astar",
					maxRooms: 1,
					maxOps: 500,
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

	public setSource(blackList: string[] = []): void {
		// Get energy from containers
		let structs = this.creep.room.containers.filter((structure: StructureContainer) =>
		blackList.indexOf(structure.id) === -1 && structure.structureType === STRUCTURE_CONTAINER
		&& structure.store[RESOURCE_ENERGY] > 300);
		let source: StructureContainer = this.creep.pos.findClosestByPath(structs, {
			algorithm: "astar",
			maxRooms: 1,
			maxOps: 500,
			costCallback: this.roomCallback,
		}) as StructureContainer;
		if (!source) {
			// No energy in containers found. Get some minerals instead
			structs = this.creep.room.containers.filter((structure: StructureContainer) =>
			blackList.indexOf(structure.id) === -1 && structure.structureType === STRUCTURE_CONTAINER
			&& _.sum(structure.store) > 400);
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
				this.setSource(blackList);
			} else {
				this.creep.memory.source = source.id;
			}
		} else if (!!this.creep.room.storage && this.creep.room.storage.store[RESOURCE_ENERGY] > 0) {
			if (!!this.scanForTargets()) { // Only collect from the storage if we have targets that require energy.
				this.creep.memory.source = this.creep.room.storage.id;
				this.creep.memory.mineralType = RESOURCE_ENERGY;
			}
		}
	}

	public muleLogic(): void {
		if (!!this.creep.memory.dumping && _.sum(this.creep.carry) === 0) {
			delete this.creep.memory.dumping;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.idle;
			this.creep.say("M:COL");
		}
		if (!this.creep.memory.dumping && !this.creep.memory.idle &&
			_.sum(this.creep.carry) === this.creep.carryCapacity) {
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
			if (_.sum(this.creep.carry) > 0 && this.creep.carry.energy === 0) {
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
				} else {
					// scan for dropped energy if we have room
					if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
						let target: Resource = this.creep.pos.findClosestByPath(FIND_DROPPED_ENERGY, {
							filter: (r: Resource) => r.amount > 100,
							algorithm: "astar",
							maxRooms: 1,
							maxOps: 500,
							costCallback: this.roomCallback,
						}) as Resource;
						if (!!target) {
							if (!this.creep.pos.isNearTo(target)) {
								this.moveTo(target.pos);
							} else {
								this.creep.pickup(target);
							}
						} else {
							// No dropped energy found, proceed to offload at Storage.
							this.dumpAtStorage();
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
					if (!this.creep.pos.isNearTo(source)) {
						this.creep.memory.source = source.id;
						this.moveTo(source.pos);
					} else {
						if (!this.creep.memory.mineralType) {
							this.creep.memory.mineralType = RESOURCE_ENERGY;
						}
						let status = this.creep.withdraw(source, this.creep.memory.mineralType);
						switch (status) {
							case ERR_NOT_ENOUGH_RESOURCES:
							case ERR_INVALID_TARGET:
							case ERR_NOT_OWNER:
							case ERR_FULL:
								delete this.creep.memory.source;
								this.setSource();
								break;
							case OK:
								break;
							default:
								console.log(`Unhandled ERR in RoleMule.source.container: ${status}`);
						}
					}
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
				}
			}
		}
	};

	public pickupResourcesInRange(): void {
		if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
			let p = this.creep.pos;
			let targets = this.creep.room.lookForAtArea(LOOK_RESOURCES, p.y - 1, p.x - 1, p.y + 1, p.x + 1, true) as LookAtResultWithPos[];
			// let targets = this.creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
			if (targets.length > 0) {
				_.each(targets, function (t) {
					if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
						this.creep.pickup(t.resource);
					}
				}, this);
			}
			if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
				let containers = this.creep.room.allStructures.filter((s: StructureContainer) => s.structureType === STRUCTURE_CONTAINER
					&& _.sum(s.store) > 50
					&& s.pos.isNearTo(this.creep.pos)
				);
				if (containers.length > 0) {
					_.each(containers, function (t: StructureContainer) {
						if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
							if (t.store.energy > 50) {
								this.creep.withdraw(t, RESOURCE_ENERGY);
							} else {
								let x: string = this.getMineralTypeFromStore(t);
								this.creep.withdraw(t, x);
							}
						}
					}, this);
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
