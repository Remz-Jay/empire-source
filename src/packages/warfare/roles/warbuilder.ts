import WarfareCreepAction from "../warfareCreepAction";

export default class WarBuilder extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "WarBuilder";

	public static maxParts = 12;
	public static maxCreeps = 1;
	public static bodyPart = [WORK, WORK, CARRY, MOVE];

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
	public boosts: string[] = [
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
		RESOURCE_CATALYZED_LEMERGIUM_ACID, // +100% build/repair
	];
	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
		this.storage = this.creep.room.storage;
	}

	public action(): boolean {
		if (this.getBoosted()) {
			if (!this.moveUsingPositions()) {
				if (this.creep.bagFull) {
					this.creep.memory.building = true;
				}
				if (this.creep.bagEmpty || !this.creep.memory.building) {
					this.creep.memory.building = false;
					if (!!this.storage && this.storage.store.energy > 0) {
						if (!this.creep.pos.isNearTo(this.storage.pos)) {
							this.moveTo(this.storage.pos);
						} else {
							this.creep.withdraw(this.storage, RESOURCE_ENERGY);
						}
					} else {
						this.harvestFromContainersAndSources();
					}
				} else {
					/*const positions = this.safeLook(LOOK_STRUCTURES, this.creep.pos, 3);
					const rampart: StructureRampart;
					positions.forEach((pos: any) => {
						if (pos.structure.structureType === STRUCTURE_RAMPART) {
							rampart = pos.structure;
						}
					});
					if (!!rampart) {
						this.creep.repair(rampart);
					} else {*/
						let target: ConstructionSite;
						if (!this.creep.memory.target) {
							target = this.creep.pos.findClosestByRange(this.creep.room.myConstructionSites);
							if (!!target) {
								this.creep.memory.target = target.id;
							}
						} else {
							target = Game.getObjectById(this.creep.memory.target) as ConstructionSite;
						}
						if (!!target) {
							if (!this.creep.pos.inRangeTo(target.pos, 3)) {
								this.moveTo(target.pos);
							} else {
								this.creep.build(target);
							}
						} else {
							delete this.creep.memory.target;
						}
					// }
				}
			}
		}
		return true;
	}
}
