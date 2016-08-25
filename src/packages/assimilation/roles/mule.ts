import ASMCreepAction from "../assimilationCreepAction";
export interface IASMMule {
	action(): boolean;
}

export default class ASMMule extends ASMCreepAction implements IASMMule {

	public container: StructureContainer;
	public storage: StructureStorage;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.container = Game.getObjectById<StructureContainer>(this.creep.memory.container);
		if (!this.creep.memory.storage) {
			this.storage = Game.rooms[this.creep.memory.config.homeRoom].storage;
			this.creep.memory.storage = this.storage.id;
		} else {
			this.storage = Game.getObjectById<StructureStorage>(this.creep.memory.storage);
		}
	}

	public isBagEmpty(): boolean {
		delete this.creep.memory.bagFull;
		return (this.creep.carry.energy === 0);
	}

	public isBagFull(): boolean {
		if (!!this.creep.memory.bagFull) {
			if (this.creep.carry.energy === 0) {
				delete this.creep.memory.bagFull;
				return false;
			}
			return true;
		}
		if (_.sum(this.creep.carry) === this.creep.carryCapacity) {
			this.creep.memory.bagFull = true;
			return true;
		}
		return false;
	}

	public dumpAtStorageOrLink() {
		if (!this.creep.memory.target) {
			// find a nearby link first, if storage isn't close
			if (!!this.storage && this.creep.carry.energy > 0 && !this.creep.pos.inRangeTo(this.storage.pos, 9)) {
				let target: StructureLink[] = this.creep.room.myStructures.filter((s: StructureLink) => s.structureType === STRUCTURE_LINK
					&& s.pos.inRangeTo(this.creep.pos, 15)
				) as StructureLink[];
				if (!!target && target.length > 0) {
					this.creep.memory.target = target[0].id;
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
	}

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
					let containers = this.creep.room.containers.filter((s: StorageStructure) => _.sum(s.store) < s.storeCapacity && s.pos.isNearTo(this.creep));
					if (containers.length > 0) {
						this.creep.transfer(containers[0], RESOURCE_ENERGY);
					}
					break;
				case ERR_NOT_ENOUGH_RESOURCES:
					if (!(target instanceof StructureStorage) || _.sum(this.creep.carry) === 0) {
						delete this.creep.memory.target;
						// We're empty, drop from idle to pick up new stuff to haul.
						delete this.creep.memory.idle;
						// this.muleLogic();
					}
					break;
				case OK:
					break;
				default:
					console.log(`Status ${status} not defined for RoleMule.dump`);
			}
		}
	};

	public collectFromContainer() {
		if (!this.creep.memory.mineralType) {
			this.creep.memory.mineralType = RESOURCE_ENERGY;
		}
		if (!this.creep.pos.isNearTo(this.container.pos)) {
			this.moveTo(this.container.pos);
		} else {
			this.creep.withdraw(this.container, this.creep.memory.mineralType, (this.creep.carryCapacity - _.sum(this.creep.carry)));
		}
	}

	public action(): boolean {
		if (this.renewCreep() && this.flee() && !this.shouldIGoHome()) {
			if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
				if (this.isBagEmpty()) {
					this.moveToTargetRoom();
				} else {
					if (!!this.creep.memory.resetTarget) {
						delete this.creep.memory.resetTarget;
						delete this.creep.memory.target;
					}
					if (this.creep.room.name === this.creep.memory.homeRoom) {
						if (this.creep.ticksToLive < 350) {
							this.creep.memory.hasRenewed = false;
						}
						this.dumpAtStorageOrLink();
					} else {
						this.creep.memory.resetTarget = true;
						this.dumpRoutine(this.storage);
					}
				}
			} else {
				this.pickupResourcesInRange();
				if (this.isBagFull() && this.repairInfra()) {
					this.creep.memory.resetTarget = true;
					this.dumpRoutine(this.storage);
				} else if (!this.isBagFull()) {
					this.collectFromContainer();
				}
			}
		}
		return true;
	}
}
