import WarfareCreepAction from "../warfareCreepAction";

export default class WarUpgrader extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "WarUpgrader";

	public static maxParts = 10;
	public static maxCreeps = 1;
	public static bodyPart = [CARRY, WORK, WORK, WORK, MOVE];

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

	public targetController: StructureController;
	public storage: StructureStorage;
	public boosts: string[] = [
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
		RESOURCE_CATALYZED_GHODIUM_ACID, // +100% upgradeController effectiveness without increasing the energy cost
		RESOURCE_CATALYZED_KEANIUM_ACID, // +150 carry
	];
	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
		this.targetController = Game.rooms[this.creep.memory.config.targetRoom].controller;
		this.storage = this.creep.room.storage;
	}

	public action(): boolean {
		if (this.getBoosted()) {
			if (!this.moveUsingPositions()) {
				if (this.creep.bagFull) {
					this.creep.memory.upgrading = true;
				}
				if (this.creep.bagEmpty || !this.creep.memory.upgrading) {
					this.creep.memory.upgrading = false;
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
					if (!this.creep.pos.inRangeTo(this.targetController.pos, 3)) {
						this.moveTo(this.targetController.pos);
					} else {
						// once we're at the controller, claim it.
						this.creep.upgradeController(this.targetController);
					}
				}
			}
		}
		return true;
	}
}
