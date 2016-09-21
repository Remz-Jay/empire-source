import WarfareCreepAction from "../warfareCreepAction";

export interface IWarUpgrader {
	action(): boolean;
}

export default class WarUpgrader extends WarfareCreepAction implements IWarUpgrader {
	public targetController: StructureController;
	public storage: StructureStorage;
	public boosts: string[] = [
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
		RESOURCE_CATALYZED_GHODIUM_ACID, // +100% upgradeController effectiveness without increasing the energy cost
	];
	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
		this.targetController = Game.rooms[this.creep.memory.config.targetRoom].controller;
		this.storage = this.creep.room.storage;
	}

	public action(): boolean {
		if (this.getBoosted()) {
			if (!this.moveUsingPositions()) {
				if (this.creep.carry.energy === 0) {
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
