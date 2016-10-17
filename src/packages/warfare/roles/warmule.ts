import WarfareCreepAction from "../warfareCreepAction";

export interface IWarMule {
	action(startCpu: number): boolean;
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
		if (!!this.creep.memory.full || this.creep.bagFull) {
			const storage = Game.rooms[this.creep.memory.homeRoom].storage;
			if (!!storage && !this.creep.pos.isNearTo(storage.pos)) {
				// get in range
				this.moveTo(storage.pos);
				this.creep.say("Storage");
			} else {
				if (this.creep.bagEmpty) {
					delete this.creep.memory.full;
				} else {
					const status = this.creep.logTransfer(storage, this.getMineralTypeFromStore(this.creep));
					if (status === OK) {
						this.positionIterator = this.creep.memory.positionIterator = 0;
					}
				}
			}
		} else if (!this.moveUsingPositions()) {
			if (this.powerBankDuty) {
				this.creep.say("Collect");
				const powerBanks = this.creep.room.groupedStructures[STRUCTURE_POWER_BANK];
				if (!!powerBanks && powerBanks.length > 0) {
					if (!this.creep.pos.isNearTo(powerBanks[0])) {
						this.moveTo(powerBanks[0].pos);
					}
				} else {
					const target = this.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES) as Resource;
					if (!!target && !this.creep.pos.isNearTo(target)) {
						// get in range
						this.moveTo(target.pos);
					} else if (!!target && this.creep.hits > (this.creep.hitsMax / 2)) {
						this.creep.pickup(target);
					} else {
						this.creep.memory.full = true;
					}
				}
			}
		} else {
			this.creep.say("Mup");
		}
	}

	public action(startCpu: number): boolean {
		this.startCpu = startCpu;
		if (this.getBoosted()) {
			this.move();
		}
		return true;
	}
}
