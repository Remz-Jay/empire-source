import ASMCreepAction from "../assimilationCreepAction";

export default class ASMRaider extends ASMCreepAction {

	public static PRIORITY: number = global.PRIORITY_ASM_MULE;
	public static MINRCL: number = global.MINRCL_ASM_MULE;
	public static ROLE: string = "ASMRaider";

	public static bodyPart: string[] = [CARRY, MOVE];
	public static maxParts: number = 25;
	public static maxCreeps: number = 6;

	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public static getCreepLimit(room: Room): number {
		return this.maxCreeps;
	}

	public storage: StructureStorage;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		if (!this.creep.memory.storage) {
			this.storage = Game.rooms[this.creep.memory.config.homeRoom].storage;
			this.creep.memory.storage = this.storage.id;
		} else {
			this.storage = Game.getObjectById<StructureStorage>(this.creep.memory.storage);
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
				const target: StructureContainer = this.creep.pos.findClosestByPath(this.creep.room.groupedStructures[STRUCTURE_CONTAINER], {
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
	}

	public dumpRoutine(target: Structure): void {
		if (!this.creep.pos.isNearTo(target)) {
			this.creep.memory.target = target.id;
			this.moveTo(target.pos);
		} else {
			let status: number;
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
					const containers = this.creep.room.groupedStructures[STRUCTURE_CONTAINER].filter((c: StorageStructure) => c.pos.isNearTo(this.creep.pos));
					if (containers.length > 0) {
						this.creep.logTransfer(containers[0], RESOURCE_ENERGY);
					}
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

	public collectFromStorage(): boolean {
		if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
			return false;
		}
		if (!this.creep.pos.isNearTo(this.creep.room.storage)) {
			this.moveTo(this.creep.room.storage.pos);
		} else {
			/*const extensions = this.creep.pos.findInRange<StructureExtension>(FIND_HOSTILE_STRUCTURES, 1, {
			 filter: (s: StructureExtension) => s.structureType === STRUCTURE_EXTENSION && s.energy > 0,
			 });
			 if (extensions.length && extensions.length > 0) {
			 this.creep.withdraw(extensions[0], RESOURCE_ENERGY);
			 return true;
			 }*/
			this.creep.withdraw(this.creep.room.storage, RESOURCE_ENERGY);
		}
		return true;
	}

	public action(): boolean {
		if (!this.renewCreep()) {
			return false;
		}
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
			this.creep.pickupResourcesInRange();
			if (this.isBagFull()) {
				this.creep.memory.resetTarget = true;
				this.dumpRoutine(this.storage);
			} else if (!this.isBagFull()) {
				this.collectFromStorage();
			}
		}
		return true;
	}
}
