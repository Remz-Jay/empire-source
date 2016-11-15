import CreepAction from "../creepAction";

export default class Builder extends CreepAction {

	public static PRIORITY: number = global.PRIORITY_BUILDER;
	public static ROLE: string = "Builder";
	public static MINRCL: number = global.MINRCL_BUILDER;

	public static bodyPart: string[] = [WORK, CARRY, MOVE];
	public static maxParts: number = 15;
	public static maxCreeps: number = 1;

	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const properties: CreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public static getCreepLimit(room: Room): number {
		return (room.myConstructionSites.length > 0) ? 1 : 0;
	}

	public boosts: string[] = [
		RESOURCE_CATALYZED_LEMERGIUM_ACID, // +100% repair and build without increasing the energy cost
	];
	private target: ConstructionSite | Structure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.target = Game.getObjectById(this.creep.memory.target) as Structure;
		if (this.creep.bagEmpty) {
			if (!!this.creep.room.storage) {
				this.target = this.creep.room.storage;
			} else {
				const storageStructures = _.union(
					this.creep.room.groupedStructures[STRUCTURE_TERMINAL],
					this.creep.room.groupedStructures[STRUCTURE_CONTAINER],
					this.creep.room.groupedStructures[STRUCTURE_STORAGE],
					this.creep.room.groupedStructures[STRUCTURE_LINK],
				);
				let source: Structure | Source = this.creep.pos.findClosestByPath(storageStructures, {
					filter: (structure: StorageStructure | StructureLink) => (
					(structure instanceof StructureContainer || structure instanceof StructureStorage || structure instanceof StructureTerminal)
					&& !!structure.store && structure.store[RESOURCE_ENERGY] > (this.creep.carryCapacity - this.creep.carrySum)) // containers and storage
					|| (structure instanceof StructureLink && !!structure.energy && structure.energy >= (this.creep.carryCapacity - this.creep.carrySum)), // links
					maxRooms: 1,
					algorithm: "astar",
					ignoreCreeps: true,
					costCallback: this.roomCallback,
					maxOps: 1000,
				}) as StorageStructure | StructureLink;
				if (!!source) {
					this.target = source;
				}
			}
			if (!!this.target) {
				this.creep.memory.target = this.target.id;
			} else {
				delete this.creep.memory.target;
			}
		}
		if (!this.target || (!(this.target instanceof ConstructionSite) && !this.creep.bagEmpty)) {
			this.target = this.findTarget();
			if (!!this.target) {
				this.creep.memory.target = this.target.id;
			} else {
				this.target = this.creep.room.myGroupedStructures[STRUCTURE_SPAWN][0];
				this.creep.memory.id = this.target.id;
			}
		}
		if (this.creep.carrySum > this.creep.carry.energy) {
			this.target = this.creep.room.storage;
			this.creep.memory.target = this.target.id;
			if (this.creep.pos.isNearTo(this.target)) {
				this.creep.transfer(this.target, this.getMineralTypeFromStore(this.creep));
			}
		}
	}

	public action(): boolean {
		if (!!this.target && this.target instanceof StructureSpawn) {
			this.recycle();
			return false;
		}
		if (!this.getBoosted()) {
			return false;
		}
		if (!this.creep.bagFull) {
			this.withdrawFromCloseTarget([], false, RESOURCE_ENERGY);
		}
		if (!this.creep.bagEmpty) {
			this.build();
		}
		this.move();
		return true;
	}
	private build(): boolean {
		if (!!this.target && this.target instanceof ConstructionSite && this.creep.pos.inRangeTo(this.target.pos, 3)) {
			this.creep.build(this.target);
		}
		return true;
	}
	private recycle(): boolean {
		if (!this.target) {
			this.target = this.creep.room.myGroupedStructures[STRUCTURE_SPAWN][0];
			this.creep.memory.id = this.target.id;
		}
		if (!this.creep.pos.isNearTo(this.target)) {
			this.moveTo(this.target.pos);
		} else {
			if (this.target instanceof StructureSpawn) {
				this.target.recycleCreep(this.creep);
			}
		}
		return true;
	}
	private move(): boolean {
		if (!!this.target) {
			if (!(this.target instanceof ConstructionSite) && !this.creep.pos.isNearTo(this.target)) {
				this.moveTo(this.target.pos);
			} else if (!this.creep.pos.inRangeTo(this.target.pos, 3)) {
				const pfg = this.createPathFinderMap(this.target.pos, 3);
				this.moveTo(pfg);
			}
		}
		return true;
	}
	private findTarget(): ConstructionSite {
		return this.creep.pos.findClosestByRange(this.creep.room.myConstructionSites) as ConstructionSite;
	}
}
