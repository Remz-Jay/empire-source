import CreepAction from "../creepAction";

export default class Mule extends CreepAction {

	public static PRIORITY: number = global.PRIORITY_MULE;
	public static MINRCL: number = global.MINRCL_MULE;
	public static ROLE: string = "Mule";

	public static bodyPart = [CARRY, CARRY, MOVE];
	public static maxParts = 10;
	public static maxCreeps = 2;
	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const spawn = room.getFreeSpawn();
		const properties: CreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
			target_controller_id: room.controller.id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public static getBody(room: Room): string[] {
		const emergency = this.getCreepsInRole(room).length < 1 || (room.energyInContainers + room.energyAvailable)  < (room.energyCapacityAvailable * 0.8);
		let numParts: number;
		if (this.getNumberOfCreepsInRole(room) > 0 && !emergency) {
			numParts = _.floor((room.energyCapacityAvailable) / global.calculateRequiredEnergy(this.bodyPart));
		} else {
			numParts = _.floor((room.energyAvailable) / global.calculateRequiredEnergy(this.bodyPart));
		}
		numParts = global.clamp(numParts, 3, this.maxParts);
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return global.sortBodyParts(body);
	}

	public static getCreepLimit(room: Room): number {
		if (room.name === "W6N42") {
			return 3;
		}
		return (room.containers.length > 0) ? this.maxCreeps : 0;
	};

	public static getBlackList(): string[] {
		if (!!global.targetBlackList[this.ROLE] && _.isArray(global.targetBlackList[this.ROLE])) {
			return global.targetBlackList[this.ROLE];
		} else {
			global.targetBlackList[this.ROLE] = [];
			const allMules: Creep[] = global.tickCache.roles[this.ROLE];
			allMules.forEach((c: Creep) => {
				if (!!c.memory.target) {
					global.targetBlackList[this.ROLE].push(c.memory.target);
				}
				if (!!c.memory.source) {
					global.targetBlackList[this.ROLE].push(c.memory.source);
				}
			});
			return global.targetBlackList[this.ROLE];
		}
	}
	public static addToBlackList(targetId: string): void {
		if (!global.targetBlackList[this.ROLE]) {
			this.getBlackList();
		}
		global.targetBlackList[this.ROLE].push(targetId);
	}

	public scanForDrops: boolean = false;
	public storage: StructureStorage;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.storage = this.creep.room.storage || undefined;
	}

	public getTargetList(blackList: string[] = []): Structure[] {
		const energyStructures = global.filterWithCache(`energyStructures-${this.creep.room.name}`,
			_.union(
				this.creep.room.myGroupedStructures[STRUCTURE_EXTENSION],
				this.creep.room.myGroupedStructures[STRUCTURE_TOWER],
				this.creep.room.myGroupedStructures[STRUCTURE_SPAWN],
			),
			(structure: EnergyStructure) => (structure.structureType === STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity)
			|| structure.energy < (structure.energyCapacity * 0.8)
		) as Structure[];
		return energyStructures.filter((structure: EnergyStructure) => !_.includes(blackList, structure.id));
	}
	public scanForTargets(): Structure {
		const blackList = Mule.getBlackList();
		if (this.creep.room.myStructures.length > 0) {
			const structs = this.getTargetList(blackList);
			const target: EnergyStructure = this.creep.pos.findClosestByPath(structs, {
				algorithm: "astar",
				maxRooms: 1,
				maxOps: 500,
				costCallback: this.roomCallback,
			}) as EnergyStructure;
			if (!!target) {
				Mule.addToBlackList(target.id);
				return target;
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
					status = this.creep.logTransfer(target, RESOURCE_ENERGY);
					break;
				case STRUCTURE_CONTAINER:
				case STRUCTURE_STORAGE:
					if (this.creep.carry.energy > 0) {
						status = this.creep.logTransfer(target, RESOURCE_ENERGY);
					} else {
						this.creep.memory.mineralType = this.getMineralTypeFromStore(this.creep);
						status = this.creep.logTransfer(target, this.creep.memory.mineralType);
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
				const storageRange = this.creep.pos.getRangeTo(this.storage.pos);
				const target: OwnedStructure = this.creep.pos.findClosestByRange<OwnedStructure>(
					this.creep.room.myGroupedStructures[STRUCTURE_LINK].filter((s: OwnedStructure) => s.pos.getRangeTo(this.creep.pos) < storageRange)
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
				const target: StructureContainer = this.creep.pos.findClosestByPath(this.creep.room.containers, {
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
		const target: Structure = Game.getObjectById(this.creep.memory.target) as Structure;
		if (!target) {
			delete this.creep.memory.target;
		} else {
			this.dumpRoutine(target);
		}
	};

	public setSource(idle: boolean = false): void {
		const blackList = Mule.getBlackList();
		// Get energy from containers
		let structs = this.creep.room.groupedStructures[STRUCTURE_CONTAINER].filter((structure: StructureContainer) =>
		!_.includes(blackList, structure.id)
		&& structure.store[RESOURCE_ENERGY] >= (this.creep.carryCapacity - this.creep.carrySum));
		let source: StructureContainer = this.creep.pos.findClosestByPath(structs, {
			algorithm: "astar",
			maxRooms: 1,
			maxOps: 500,
			costCallback: this.roomCallback,
		}) as StructureContainer;
		if (!source && idle && this.creep.room.controller.level > 5) {
			// No energy in containers found. Get some minerals instead
			structs = this.creep.room.groupedStructures[STRUCTURE_CONTAINER].filter((structure: StructureContainer) =>
			!_.includes(blackList, structure.id)
			&& _.sum(structure.store) >= (this.creep.carryCapacity - this.creep.carrySum) / 2);
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
			Mule.addToBlackList(source.id);
			this.creep.memory.source = source.id;
		} else if (!!this.creep.room.storage && this.creep.room.storage.store[RESOURCE_ENERGY] > 0) {
			if (!idle) { // Only collect from the storage if we have targets that require energy.
				this.creep.memory.source = this.creep.room.storage.id;
				this.creep.memory.mineralType = RESOURCE_ENERGY;
			}
		}
	}

	public muleLogic(): void {
		if (!!this.creep.memory.dumping && this.creep.bagEmpty) {
			delete this.creep.memory.dumping;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.idle;
			this.creep.say("M:COL");
		}
		if (!this.creep.memory.dumping && !this.creep.memory.idle && this.creep.bagFull) {
			this.creep.memory.dumping = true;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.idle;
			this.creep.say("M:DIST");
		}
		if (!!this.creep.memory.dumping) {
			if (!this.creep.memory.target && this.creep.carry.energy > 0) {
				const target = this.scanForTargets();
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
			const target: Structure = Game.getObjectById(this.creep.memory.target) as Structure;
			if (!target) {
				delete this.creep.memory.target;
			} else {
				this.dumpRoutine(target);
			}
		} else if (!!this.creep.memory.idle) {
			if (this.creep.carrySum - this.creep.carry.energy > 0) {
				// We're carrying Minerals. Drop them off first before returning to duty.
				this.dumpAtStorage();
			} else {
				// return to duty when able
				let target: Structure = undefined;
				if (Game.time & 4) {
					target = this.scanForTargets();
				}
				if (!!target) {
					this.creep.memory.target = target.id;
					delete this.creep.memory.idle;
					this.creep.memory.dumping = true;
					this.muleLogic();
				} else {
					// scan for dropped energy if we have room
					if (!this.creep.bagFull) {
						let target: Resource;
						if (this.scanForDrops) {
							const resources = this.creep.room.find(FIND_DROPPED_RESOURCES, {filter: (r: Resource) => r.amount > 100});
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
								const source = Game.getObjectById(this.creep.memory.source);
								if (!!source && source instanceof Structure) { // Sources aren't structures
									this.collectFromSource(source);
								} else {
									delete this.creep.memory.source;
									delete this.creep.memory.mineralType;
								}
							} else if (!this.creep.bagEmpty) {
								// No sources found, proceed to offload at Storage.
								this.dumpAtStorage();
							} else {
								const flag = Game.flags[this.creep.room.name];
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
				const source = Game.getObjectById(this.creep.memory.source);
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
						const resources = this.creep.room.find(FIND_DROPPED_RESOURCES, {filter: (r: Resource) => r.amount > 100});
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
						const flag = Game.flags[this.creep.room.name];
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
			const drops = source.pos.lookFor(LOOK_RESOURCES);
			if (drops.length > 0) {
				_.forEach(drops, (drop: Resource) => {
					this.creep.pickup(drop);
				});
			} else {
				const status = this.creep.withdraw(source, this.creep.memory.mineralType);
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
		if (!this.creep.bagFull) {
			const targets = this.creep.safeLook(LOOK_RESOURCES, 1);
			if (targets.length > 0) {
				_.each(targets, function (t) {
					if (!this.creep.bagFull) {
						this.creep.pickup(t.resource);
					}
				}, this);
			} else {
				if (!this.creep.bagFull) {
					const containers = this.creep.room.groupedStructures[STRUCTURE_CONTAINER].filter(
						(s: StructureContainer) =>_.sum(s.store) > 50
						&& s.pos.isNearTo(this.creep.pos)
					) as StructureContainer[];
					if (containers.length > 0) {
						const t = containers.shift();
						if (t.store.energy > 50) {
							this.creep.withdraw(t, RESOURCE_ENERGY);
						} else {
							const x: string = this.getMineralTypeFromStore(t);
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
		this.dumpToCloseTarget();
		return true;
	}
}
