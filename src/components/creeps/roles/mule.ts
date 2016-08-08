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
		let target: EnergyStructure = <EnergyStructure> this.creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
			filter: (structure: EnergyStructure) => ( blackList.indexOf(structure.id) === -1 &&
				(
					(structure.structureType === STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity)
					|| ((structure.structureType === STRUCTURE_TOWER || structure.structureType === STRUCTURE_SPAWN)
					&& structure.energy < (structure.energyCapacity * 0.8))
				)
			),
		});
		if (!!target) {
			let taken = this.creep.room.find(FIND_MY_CREEPS, {
				filter: (c: Creep) => c.name !== this.creep.name
				&& c.memory.role === this.creep.memory.role
				&& (!!c.memory.target && c.memory.target === target.id),

			});
			if (!!taken && taken.length > 0) {
				blackList.push(target.id);
				return this.assignNewTarget(blackList);
			} else {
				this.targetEnergyDropOff = target;
				this.creep.memory.target_energy_dropoff_id = target.id;
				return true;
			}
		} else {
			return false;
		}
	}

	public isBagEmpty(): boolean {
		return (this.creep.carry.energy === 0);
	}

	public moveToCollectEnergy(): void {
		if (this.tryCollectEnergy() === ERR_NOT_IN_RANGE) {
			this.moveTo(this.targetEnergySource.pos);
		}
	}

	public tryCollectEnergy(): number {
		return this.creep.withdraw(this.targetEnergySource, RESOURCE_ENERGY);
	}

	public scanForTargets(blackList: string[] = []): Structure {
		let target: EnergyStructure = this.creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
			filter: (structure: EnergyStructure) => ( blackList.indexOf(structure.id) === -1 &&
				(
					(structure.structureType === STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity)
					|| ((structure.structureType === STRUCTURE_TOWER || structure.structureType === STRUCTURE_SPAWN)
					&& structure.energy < (structure.energyCapacity * 0.8))
				)
			),
		}) as EnergyStructure;
		if (!!target) {
			let taken: Creep[] = this.creep.room.find(FIND_MY_CREEPS, {
				filter: (c: Creep) => c.name !== this.creep.name
				&& c.memory.role === this.creep.memory.role
				&& (!!c.memory.target && c.memory.target === target.id),
			}) as Creep[];
			if (!!taken && taken.length > 0) {
				blackList.push(target.id);
				return this.scanForTargets(blackList);
			} else {
				return target;
			}
		} else {
			return undefined;
		}
	};

	public dumpRoutine(target: Structure): void {
		switch (target.structureType) {
			case STRUCTURE_EXTENSION:
			case STRUCTURE_SPAWN:
			case STRUCTURE_TOWER:
			case STRUCTURE_CONTAINER:
			case STRUCTURE_STORAGE:
			case STRUCTURE_LINK:
				let status = this.creep.transfer(target, RESOURCE_ENERGY);
				switch (status) {
					case ERR_NOT_IN_RANGE:
						if (!!this.creep.memory.target && this.creep.memory.target === target.id && !!this.creep.memory.targetPath) {
							let path = this.deserializePathFinderPath(this.creep.memory.targetPath);
							this.moveByPath(path, target);
						} else {
							this.creep.memory.target = target.id;
							delete this.creep.memory.targetPath;
							if (!this.findNewPath(target)) {
								this.creep.say("HALP!");
							}
						}
						break;
					case ERR_FULL:
					case ERR_NOT_ENOUGH_ENERGY:
						delete this.creep.memory.target;
						delete this.creep.memory.targetPath;
						// We're empty, drop from idle to pick up new stuff to haul.
						delete this.creep.memory.idle;
						this.muleLogic();
						break;
					case OK:
						delete this.creep.memory.targetPath;
						break;
					default:
						console.log(`Status ${status} not defined for RoleMule.dump`);
				}
				break;
			case STRUCTURE_CONTROLLER:
				if (this.creep.upgradeController(target as StructureController) === ERR_NOT_IN_RANGE) {
					this.moveTo(target.pos);
				}
				break;
			default:
				console.log(`Unhandled Structure in RoleMule.dumpRoutine: ${target.structureType} on target ${target}`);
		}
	};
	public dumpAtStorage(): void {
		if (!this.creep.memory.target) {
			// find a nearby link first, if storage isn't close
			if (!!this.creep.room.storage && this.creep.pos.getRangeTo(this.creep.room.storage) > 9) {
				let target: StructureLink[] = this.creep.pos.findInRange(FIND_STRUCTURES, 10, {
					filter: (s: StructureLink) => s.structureType === STRUCTURE_LINK
					&& s.energy < s.energyCapacity,
				}) as StructureLink[];
				if (!!target && target.length > 0) {
					this.creep.memory.target = target[0].id;
				} else {
					this.creep.memory.target = this.creep.room.storage.id;
				}
			} else if (!!this.creep.room.storage) {
				this.creep.memory.target = this.creep.room.storage.id;
			} else {
				// last resort; just return energy to the nearest container.
				let target: StructureContainer = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure: StructureContainer) => structure.structureType === STRUCTURE_CONTAINER
					&& _.sum(structure.store) < structure.storeCapacity,
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

	public muleLogic(): void {
		if (!!this.creep.memory.dumping && this.creep.carry.energy === 0) {
			delete this.creep.memory.dumping;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.idle;
			this.creep.say("M:COL");
		}
		if (!this.creep.memory.dumping && !this.creep.memory.idle &&
			this.creep.carry.energy === this.creep.carryCapacity) {
			this.creep.memory.dumping = true;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.idle;
			this.creep.say("M:DIST");
		}
		if (!!this.creep.memory.dumping) {
			if (!this.creep.memory.target) {
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
			}
			let target: Structure = Game.getObjectById(this.creep.memory.target) as Structure;
			if (!target) {
				delete this.creep.memory.target;
			} else {

				this.dumpRoutine(target);
			}
		} else if (!!this.creep.memory.idle) {
			// return to duty when able
			let target = this.scanForTargets();
			if (!!target) {
				this.creep.memory.target = target.id;
				delete this.creep.memory.idle;
				this.creep.memory.dumping = true;
			} else {
				// scan for dropped energy if we have room
				if (this.creep.carry.energy < this.creep.carryCapacity) {
					let target: Resource = this.creep.pos.findClosestByPath(FIND_DROPPED_ENERGY, {maxRooms: 1}) as Resource;
					if (!!target) {
						if (this.creep.pickup(target) === ERR_NOT_IN_RANGE) {
							this.moveTo(target.pos);
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

		} else {
			if (!this.creep.memory.source) {
				// Get energy from containers
				let source: StructureContainer = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure: StructureContainer) => structure.structureType === STRUCTURE_CONTAINER &&
					structure.store[RESOURCE_ENERGY] > 100,
				}) as StructureContainer;
				if (!!source) {
					this.creep.memory.source = source.id;
				} else if (!!this.creep.room.storage && this.creep.room.storage.store[RESOURCE_ENERGY] > 0) {
					this.creep.memory.source = this.creep.room.storage.id;
				}
			}
			if (!!this.creep.memory.source) {
				let source = Game.getObjectById(this.creep.memory.source);
				if (source instanceof Structure) { // Sources aren't structures
					let status = this.creep.withdraw(source, RESOURCE_ENERGY);
					switch (status) {
						case ERR_NOT_ENOUGH_RESOURCES:
						case ERR_INVALID_TARGET:
						case ERR_NOT_OWNER:
						case ERR_FULL:
							delete this.creep.memory.source;
							break;
						case ERR_NOT_IN_RANGE:
							this.moveTo(source.pos);
							break;
						case OK:
							break;
						default:
							console.log(`Unhandled ERR in RoleMule.source.container: ${status}`);
					}
				} else {
					delete this.creep.memory.source;
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

	public action(): boolean {
		if (super.action()) {
			this.muleLogic();
		}
		return true;
	}

}
