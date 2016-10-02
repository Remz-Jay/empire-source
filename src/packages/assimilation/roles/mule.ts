import ASMCreepAction from "../assimilationCreepAction";
export interface IASMMule {
	action(startCpu: number): boolean;
}

export default class ASMMule extends ASMCreepAction implements IASMMule {

	public container: StructureContainer;
	public keeperLair: StructureKeeperLair;
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
			const containerId = this.governor.checkContainerAssignment();
			if (!!containerId) {
				this.creep.memory.container = containerId;
				this.setCreep(creep);
			} else {
				this.creep.suicide();
			}
		}
	}

	public isBagEmpty(): boolean {
		delete this.creep.memory.bagFull;
		return this.creep.bagEmpty;
	}

	public isBagFull(): boolean {
		if (!!this.creep.memory.bagFull) {
			if (this.creep.bagEmpty) {
				delete this.creep.memory.bagFull;
				return false;
			}
			return true;
		}
		if (this.creep.bagFull) {
			this.creep.memory.bagFull = true;
			return true;
		}
		return false;
	}

	public dumpAtStorageOrLink() {
		if (!this.creep.memory.target) {
			// find a link that's closer than storage
			if (!!this.storage && this.creep.carry.energy > 0) {
				const storageRange = this.creep.pos.getRangeTo(this.storage.pos);
				const links = this.creep.room.myStructures.filter(
					(s: StructureLink) => s.structureType === STRUCTURE_LINK
					&& s.energy <= (s.energyCapacity / 2));
				const target: OwnedStructure = this.creep.pos.findClosestByPath<OwnedStructure>(links, {
					filter: (l: StructureLink) => l.pos.getRangeTo(this.creep.pos) < storageRange,
					algorithm: "astar",
					costCallback: this.roomCallback,
					maxOps: 500,
				});
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					this.creep.memory.target = this.storage.id;
				}
			}
		}
		const target: Structure = Game.getObjectById(this.creep.memory.target) as Structure;
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
				case STRUCTURE_LINK:
					const link = <StructureLink> target;
					if (link.energy < link.energyCapacity) {
						status = this.creep.transfer(link, RESOURCE_ENERGY);
					} else {
						return;
					}
					break;
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
					if (!(target instanceof StructureStorage) || this.creep.bagEmpty) {
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
		if (this.container.store.energy > (this.creep.carryCapacity - this.creep.carry.energy)) {
			return true;
		}
		if (!this.creep.memory.dropTarget) {
			const drops = this.creep.room.find(FIND_DROPPED_RESOURCES,
				{filter: (r: Resource) => r.amount >= (this.creep.carryCapacity / 2)}
			) as Resource[];
			if (drops.length > 0) {
				const drop = this.creep.pos.findClosestByPath(drops, {
					maxRooms: 1,
					costCallback: this.roomCallback,
				});
				this.creep.memory.dropTarget = drop.id;
			}
		}
		if (!!this.creep.memory.dropTarget) {
			const drop = Game.getObjectById(this.creep.memory.dropTarget) as Resource;
			if (!!drop && drop.amount > 100) {
				if (!this.creep.pos.isNearTo(drop.pos)) {
					this.moveTo(drop.pos);
				} else {
					this.creep.pickup(drop);
					delete this.creep.memory.dropTarget;
				}
				return false;
			} else {
				delete this.creep.memory.dropTarget;
				return true;
			}
		}
		return true;
	}

	public collectFromContainer() {
		if (this.collectFromDrops()) {
			if (!this.creep.pos.isNearTo(this.container.pos)) {
				this.moveTo(this.container.pos);
			} else {
				const drops = this.container.pos.lookFor(LOOK_RESOURCES);
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

	public action(startCpu: number): boolean {
		this.startCpu = startCpu;
		if (this.renewCreep() && this.flee() && !this.shouldIGoHome()) {
			if (!this.checkCpu()) {
				return false;
			}
			if (this.creep.carry.energy === 0 && !this.creep.bagEmpty) {
				this.creep.drop(this.getMineralTypeFromStore(this.creep));
			}
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
