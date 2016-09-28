import WarfareCreepAction from "../warfareCreepAction";

export interface IWarMule {
	action(): boolean;
}

export default class WarMule extends WarfareCreepAction implements IWarMule {
	public powerBankDuty: boolean = true;
	public boosts: string[] = [
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
	];
	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
	}

	public move() {
		if (this.creep.carrySum > (this.creep.carryCapacity / 2)) {
			let storage = Game.rooms[this.creep.memory.homeRoom].storage;
			if (!!storage && !this.creep.pos.isNearTo(storage.pos)) {
				// get in range
				this.moveTo(storage.pos);
				this.creep.say("Storage");
			} else {
				let status = this.creep.transfer(storage, this.getMineralTypeFromStore(this.creep));
				if (status === OK) {
					this.positionIterator = this.creep.memory.positionIterator = 0;
				}
			}
		} else if (!this.moveUsingPositions()) {
			if (this.powerBankDuty) {
				this.creep.say("Collect");
				let target = this.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES) as Resource;
				if (!!target && !this.creep.pos.isNearTo(target)) {
					// get in range
					this.moveTo(target.pos);
				} else if (!!target && this.creep.hits > (this.creep.hitsMax / 2)) {
					this.creep.pickup(target);
				}
			}
		} else {
			this.creep.say("Mup");
		}
	}

	public action(): boolean {
		if (this.getBoosted()) {
			this.move();
		}
		return true;
	}
}
