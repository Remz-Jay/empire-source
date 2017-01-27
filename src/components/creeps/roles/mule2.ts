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
		const properties: CreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public static getBody(room: Room): string[] {
		let numParts: number;
		if (this.getNumberOfCreepsInRole(room) > 0) {
			numParts = _.floor((room.energyCapacityAvailable) / global.calculateRequiredEnergy(this.bodyPart));
		} else {
			numParts = _.floor((room.energyAvailable) / global.calculateRequiredEnergy(this.bodyPart));
		}
		numParts = global.clamp(numParts, 1, this.maxParts);
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
		return (room.groupedStructures[STRUCTURE_CONTAINER].length > 0) ? this.maxCreeps : 0;
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

	private storage: StructureStorage;
	private source: StorageStructure;
	private target: OwnedStructure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.storage = this.creep.room.storage || undefined;
		this.source = Game.getObjectById(this.creep.memory.source) as StorageStructure || undefined;
		this.target = Game.getObjectById(this.creep.memory.target) as OwnedStructure || undefined;
	}

	public action(): boolean {
		if (this.needsEnergy()) {
			this.pickupResourcesInRange();
			this.withdrawFromCloseTarget();
		}
		if (!this.target) {
			let s = this.scanForTargets();
			if (!s && this.creep.carrySum > 0) {
				this.target = this.storage;
				delete this.creep.memory.target;
			} else if (!!s) {
				this.target = s;
				this.creep.memory.target = s.id;
			} else {
				delete this.creep.memory.target;
				this.target = undefined;
			}
		}
		if (this.creep.bagEmpty) {
			let s = this.getSource();
			if (!s) {
				s = this.getMineralSource();
			}
			if (!s && !!this.target) {
				this.source = this.storage;
				delete this.creep.memory.source;
			} else if (!!s) {
				this.source = s;
				this.creep.memory.source = s.id;
			} else {
				delete this.creep.memory.source;
				this.source = undefined;
			}
		} else if (this.creep.carrySum > this.creep.carry.energy) {
			this.target = this.storage;
			delete this.creep.memory.target;
		}
		if (!this.creep.memory.target) {
			this.dumpToCloseTarget([STRUCTURE_LINK, STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_POWER_SPAWN, STRUCTURE_NUKER]);
		} else {
			this.dumpToCloseTarget();
		}
		if (!!this.source) {
			if (!this.creep.pos.isNearTo(this.source)) {
				this.moveTo(this.source.pos);
			} else {
				delete this.creep.memory.source;
				this.source = undefined;
			}
			return true;
		}
		if (!!this.target) {
			if (!this.creep.pos.isNearTo(this.target)) {
				this.moveTo(this.target.pos);
			} else {
				delete this.creep.memory.target;
				this.target = undefined;
			}
			return true;
		}
		if (!!Game.flags[this.creep.room.name] && !this.creep.pos.isNearTo(Game.flags[this.creep.room.name].pos)) {
			this.moveTo(Game.flags[this.creep.room.name].pos);
			return false;
		}
		return false;
	}

	private needsEnergy(): boolean {
		if (this.creep.bagFull) {
			return false;
		} else if (!!this.target) {
			return true;
		} else {
			return false;
		}
	}

	private getTargetList(blackList: string[] = []): OwnedStructure[] {
		const energyStructures = _.union(
			this.creep.room.myGroupedStructures[STRUCTURE_EXTENSION],
			this.creep.room.myGroupedStructures[STRUCTURE_TOWER],
			this.creep.room.myGroupedStructures[STRUCTURE_SPAWN],
		);
		return energyStructures.filter((structure: EnergyStructure) =>
			!_.includes(blackList, structure.id)
			&& ((structure.structureType === STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity)
			|| structure.energy < (structure.energyCapacity * 0.8))
		);
	}
	private scanForTargets(): OwnedStructure {
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
	private getMineralSource(): StructureContainer {
		const blackList = Mule.getBlackList();
		// Get energy from containers
		let structs = _(this.creep.room.groupedStructures[STRUCTURE_CONTAINER])
			.filter((structure: StructureContainer) =>
				!_.includes(blackList, structure.id) && _.sum(structure.store) >= (this.creep.carryCapacity - this.creep.carrySum)
			).value();
		if (structs.length > 0) {
			return this.creep.pos.findClosestByPath(structs, {
				algorithm: "astar",
				maxRooms: 1,
				maxOps: 500,
				costCallback: this.roomCallback,
			}) as StructureContainer;
		} else {
			return undefined;
		}
	}
	private getSource(): StructureContainer {
		const blackList = Mule.getBlackList();
		// Get energy from containers
		let structs = _(this.creep.room.groupedStructures[STRUCTURE_CONTAINER])
			.filter((structure: StructureContainer) =>
				!_.includes(blackList, structure.id) && structure.store.energy >= (this.creep.carryCapacity - this.creep.carrySum)
			).value();
		if (structs.length > 0) {
			return this.creep.pos.findClosestByPath(structs, {
				algorithm: "astar",
				maxRooms: 1,
				maxOps: 500,
				costCallback: this.roomCallback,
			}) as StructureContainer;
		} else {
			return undefined;
		}
	}

	private pickupResourcesInRange(): void {
		if (!this.creep.bagFull) {
			const target = _(this.creep.safeLook(LOOK_RESOURCES, 1)).map("resource").sortBy("amount").last() as Resource;
			if (!!target) {
				this.creep.pickup(target);
			}
		}
	};
}
