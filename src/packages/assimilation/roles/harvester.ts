import ASMCreepAction from "../assimilationCreepAction";

export default class ASMHarvester extends ASMCreepAction {

	public static PRIORITY: number = global.PRIORITY_ASM_HARVESTER;
	public static MINRCL: number = global.MINRCL_ASM_HARVESTER;
	public static ROLE: string = "ASMHarvester";

	public static basePart: string[] = [CARRY, CARRY, MOVE];
	public static bodyPart: string[] = [WORK, WORK, MOVE];
	public static maxParts: number = 3;
	public static maxCreeps: number = 1;
	public static containers: StructureContainer[] = [];

	public static setConfig(config: RemoteRoomConfig, containers: StructureContainer[] = []) {
		super.setConfig(config);
		this.containers = containers;
	}

	public static getBody(room: Room) {
		const hasController = _.get(this.config, "hasController", true);
		const hasClaim = _.get(this.config, "claim", false);
		if (!hasController || hasClaim) {
			this.bodyPart = [WORK, WORK, MOVE, MOVE];
			let body: string[] = [CARRY, MOVE];
			for (let i = 0; i < 4; i++) {
				body = body.concat(this.bodyPart);
			}
			return global.sortBodyParts(body);
		}
		const numParts: number = global.clamp(_.floor(
			(room.energyCapacityAvailable - global.calculateRequiredEnergy(this.basePart)) /
			global.calculateRequiredEnergy(this.bodyPart)), 1, this.maxParts);
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
		let container = _(this.containers).find((c: StructureContainer) => !this.checkAssignedHarvester(c));
		return (!!container) ? container.id : undefined;
	}

	public static checkAssignedHarvester(c: StructureContainer): Creep {
		return _(_.get(global, `tickCache.roles.${this.ROLE}`, [])).find((h: Creep) => !!h.memory.container && c.id === h.memory.container);
	}

	public static getCreepLimit(room: Room): number {
		return this.containers.length;
	}

	public container: StructureContainer;
	public source: Source;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		if (!this.creep.memory.container && !this.creep.memory.source) {
			this.creep.memory.container = ASMHarvester.checkContainerAssignment();
		}
		this.container = Game.getObjectById<StructureContainer>(this.creep.memory.container);
		if (!!this.container) {
			let other = _(_.get(global, `tickCache.rolesByRoom.${ASMHarvester.ROLE}.${this.creep.memory.homeRoom}`, [])).find(
				(h: Creep) => h.id !== this.creep.id && !!h.memory.container && this.container.id === h.memory.container);
			if (!!other) {
				delete this.creep.memory.container;
				delete this.creep.memory.source;
				delete this.creep.memory.keeperLair;
				this.creep.memory.container = ASMHarvester.checkContainerAssignment();
				this.container = Game.getObjectById<StructureContainer>(this.creep.memory.container);
			}
		} else {
			this.creep.memory.container = ASMHarvester.checkContainerAssignment();
			this.container = Game.getObjectById<StructureContainer>(this.creep.memory.container);
		}
		if (!this.creep.memory.source && !!this.container) {
			const source = this.findSourceNearContainer(this.container);
			this.source = source;
			this.creep.memory.source = source.id;
		} else {
			this.source = Game.getObjectById<Source>(this.creep.memory.source);
		}
		if (!this.creep.memory.config.hasController && !!this.source) {
			if (!!this.creep.memory.keeperLair) {
				this.keeperLair = Game.getObjectById<StructureKeeperLair>(this.creep.memory.keeperLair);
			} else {
				const lairs = this.creep.room.groupedStructures[STRUCTURE_KEEPER_LAIR].filter(
					(s: StructureKeeperLair) => s.pos.inRangeTo(this.source.pos, 5)) as StructureKeeperLair[];
				if (lairs.length > 0) {
					this.keeperLair = lairs.shift();
					this.creep.memory.keeperLair = this.keeperLair.id;
				}
			}
		}
	}
	public findSourceNearContainer(c: StructureContainer): Source {
		const sources = c.room.sources.filter((s: Source) => s.pos.isNearTo(c));
		return sources[0];
	}

	public tryHarvest(): number {
		if (!!this.container) {
			if (this.creep.carry.energy > (this.creep.carryCapacity * 0.2) && this.container.hits < this.container.hitsMax) {
				return this.creep.repair(this.container);
			} else if (_.sum(this.container.store) === this.container.storeCapacity) {
				return ERR_FULL;
			} else if (this.creep.carry.energy > (this.creep.carryCapacity * 0.8)) {
				this.creep.transfer(this.container, RESOURCE_ENERGY);
			}
		}
		if (this.source.energy > 0) {
			return this.creep.harvest(this.source);
		} else {
			return ERR_NOT_ENOUGH_RESOURCES;
		}
	}

	public moveToHarvest(): void {
		if (!!this.container) {
			if (!this.creep.pos.isEqualTo(this.container.pos)) {
				const pfg: PathFinderGoal = this.createPathFinderMap(<RoomPosition> this.container.pos, 0);
				this.moveTo(pfg);
			} else {
				this.tryHarvest();
			}
		} else {
			if (!this.creep.pos.isNearTo(this.source.pos)) {
				this.moveTo(this.source.pos);
			} else {
				this.tryHarvest();
			}
		}
	}
	public tryEnergyDropOff(): number {
		return this.creep.logTransfer(this.container, RESOURCE_ENERGY);
	}

	public moveToDropEnergy(): void {
		if (!!this.container) {
			if (!this.creep.pos.isNearTo(this.container.pos)) {
				this.moveTo(this.container.pos);
			} else if (this.creep.carry.energy > 0) {
				const status = this.tryEnergyDropOff();
				switch (status) {
					case OK:
						break;
					case ERR_FULL:
						this.creep.drop(RESOURCE_ENERGY);
						break;
					case ERR_INVALID_TARGET:
						delete this.creep.memory.container;
						delete this.creep.memory.source;
						break;
					default:
						console.log(`harvester energyDropOff error ${status}`);
				}
			}
		} else {
			const cs = _(this.creep.safeLook(LOOK_CONSTRUCTION_SITES, 3)).map("constructionSite").first() as ConstructionSite;
			if (!!cs) {
				this.creep.build(cs);
			}
		}
	}

	public action(): boolean {
		if (this.flee() && this.fleeFromKeeperLair(5) && !this.shouldIGoHome()) {
			if (!this.source && !!Game.flags[this.creep.memory.config.targetRoom]) {
				this.moveTo(Game.flags[this.creep.memory.config.targetRoom].pos);
				return false;
			}
			if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
				this.moveTo(this.container.pos);
			} else {
				if (this.creep.getActiveBodyparts(CARRY) > 0 && this.creep.bagFull) {
					this.moveToDropEnergy();
				} else {
					this.moveToHarvest();
				}
			}
		}
		return true;
	}
}
