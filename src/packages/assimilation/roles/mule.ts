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
		if (!this.container) {
			this.creep.suicide();
		}
	}

	public isBagEmpty(): boolean {
		delete this.creep.memory.bagFull;
		return (_.sum(this.creep.carry) === 0);
	}

	public isBagFull(): boolean {
		if (!!this.creep.memory.bagFull) {
			if (_.sum(this.creep.carry) === 0) {
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
					let link = <StructureLink> target;
					if (link.energy < link.energyCapacity) {
						status = this.creep.transfer(link, RESOURCE_ENERGY);
					} else {
						return;
					}
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

	public collectFromDrops(): boolean {
		if (this.container.store.energy >= (this.creep.carryCapacity - _.sum(this.creep.carry))) {
			return true;
		}
		let resources = this.safeLook(LOOK_RESOURCES, this.creep.pos, 15);
		if (resources.length > 0) {
			let r = resources[0];
			let rpos = new RoomPosition(r.x, r.y, this.creep.room.name);
			if (!this.creep.pos.isNearTo(rpos)) {
				this.moveTo(rpos);
			} else {
				this.creep.pickup(r.resource);
			}
			return false;
		}
		return true;
	}

	public collectFromContainer() {
		if (this.collectFromDrops()) {
			if (!this.creep.pos.isNearTo(this.container.pos)) {
				this.moveTo(this.container.pos);
			} else {
				let drops = this.container.pos.lookFor(LOOK_RESOURCES);
				if (drops.length > 0) {
					_.forEach(drops, (drop: Resource) => {
						this.creep.pickup(drop);
					});
				} else {
					this.creep.withdraw(this.container, this.getMineralTypeFromStore(this.container));
				}
				if (this.creep.pos.isEqualTo(this.container.pos)) {
					this.moveTo(this.storage.pos);
				}
			}
		}
	}

	public action(): boolean {
		if (this.renewCreep() && this.flee() && !this.shouldIGoHome()) {
			if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
				if (this.isBagEmpty()) {
					this.moveTo(this.container.pos);
				} else {
					this.passingRepair();
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
						this.moveTo(this.storage.pos);
					}
				}
			} else {
				this.pickupResourcesInRange(true);
				if (this.isBagFull()) {
					this.passingRepair();
					this.creep.memory.resetTarget = true;
					this.moveTo(this.storage.pos);
				} else if (!this.isBagFull()) {
					this.collectFromContainer();
				}
			}
		}
		return true;
	}
}
