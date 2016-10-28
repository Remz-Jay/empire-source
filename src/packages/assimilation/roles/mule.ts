import ASMCreepAction from "../assimilationCreepAction";

export default class ASMMule extends ASMCreepAction {

	public static PRIORITY: number = global.PRIORITY_ASM_MULE;
	public static MINRCL: number = global.MINRCL_ASM_MULE;
	public static ROLE: string = "ASMMule";

	public static bodyPart: string[] = [CARRY, CARRY, MOVE];
	public static basePart: string[] = [WORK, WORK, MOVE];
	public static maxParts: number = 23;
	public static maxCreeps: number = 1;
	public static multiplier: number = 1;
	public static containers: StructureContainer[] = [];

	public static setConfig(config: RemoteRoomConfig, containers: StructureContainer[] = []) {
		super.setConfig(config);
		this.multiplier = (config.hasController) ? 1 : 2; // SK Rooms get 2 mules / source.
		this.containers = containers;
	}

	public static getBody(room: Room) {
		const numParts = global.clamp(_.floor(
			(room.energyCapacityAvailable - global.calculateRequiredEnergy(this.basePart)) /
			global.calculateRequiredEnergy(this.bodyPart)), 0, this.maxParts);
		let body: string[] = this.basePart;
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return global.sortBodyParts(body);
	}

	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
			config: this.config,
			container: this.checkContainerAssignment(),
		};
		return {body: bodyParts, name: name, properties: properties};
	}
	public static checkContainerAssignment(): string {
		let container = _(this.containers).find((c: StructureContainer) => {
			const mules = this.checkAssignedMules(c);
			return (!mules || mules.length < this.multiplier) ? true : false;
		});
		return (!!container) ? container.id : undefined;
	}

	public static checkAssignedMules(c: StructureContainer): Creep[] {
		return _(_.get(global, `tickCache.roles.${this.ROLE}`, [])).filter((creep: Creep) => !!creep.memory.container && c.id === creep.memory.container).value();
	}
	public static getCreepLimit(room: Room): number {
		return this.containers.length * this.multiplier;
	}

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
			const containerId = ASMMule.checkContainerAssignment();
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
		if (this.creep.pos.getRangeTo(this.storage.pos) > 6) {
			let link = _(this.creep.room.myGroupedStructures[STRUCTURE_LINK])
				.filter((l: StructureLink) => l.energy < l.energyCapacity && l.pos.inRangeTo(this.creep.pos, 5))
				.first();
			if (!!link && !this.creep.pos.isNearTo(link)) {
				this.moveTo(link.pos);
			} else if (!link) {
				this.moveTo(this.storage.pos);
			}
		} else {
			this.moveTo(this.storage.pos);
		}
	}
	public collectFromDrops(): boolean {
		let drop: Resource;
		if (this.container.store.energy > (this.creep.carryCapacity - this.creep.carry.energy)) {
			return true;
		}
		if (!this.creep.memory.dropTarget) {
			drop = _(this.container.safeLook(LOOK_RESOURCES, 4)).map("resource").sortBy("amount").last() as Resource;
			if (!!drop) {
				this.creep.memory.dropTarget = drop.id;
			}
		} else {
			drop = Game.getObjectById(this.creep.memory.dropTarget) as Resource;
		}
		if (!!drop) {
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

	public collectFromContainer() {
		if (!this.creep.memory.config.hasController) {
			if (!!this.creep.memory.keeperLair) {
				this.keeperLair = Game.getObjectById<StructureKeeperLair>(this.creep.memory.keeperLair);
			} else {
				let lair = _(this.creep.room.groupedStructures[STRUCTURE_KEEPER_LAIR]).find(
					(s: StructureKeeperLair) => s.pos.inRangeTo(this.container.pos, 5)) as StructureKeeperLair;
				if (!!lair) {
					this.keeperLair = lair;
					this.creep.memory.keeperLair = this.keeperLair.id;
				}
			}
			if (!this.fleeFromKeeperLair(6)) {
				return;
			}
		}
		if (this.collectFromDrops()) {
			if (!this.creep.pos.isNearTo(this.container.pos)) {
				this.moveTo(this.container.pos);
			} else {
				const drop = _(this.container.pos.lookFor(LOOK_RESOURCES)).first();
				if (!!drop) {
					this.creep.pickup(drop as Resource);
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
		this.creep.pickupResourcesInRange(true);
		if (this.renewCreep() && this.flee() && !this.shouldIGoHome()) {
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
						// this.dumpAtStorageOrLink();
						this.dumpToCloseTarget([STRUCTURE_LINK, STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_POWER_SPAWN, STRUCTURE_NUKER]);
						this.dumpAtStorageOrLink();
					} else {
						this.creep.memory.resetTarget = true;
						this.moveTo(this.storage.pos);
					}
				}
			} else {
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
