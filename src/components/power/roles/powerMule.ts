import WarfareCreepAction from "../../../packages/warfare/warfareCreepAction";

export default class PowerMule extends WarfareCreepAction {

	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
	}

	public move() {
		if (!!this.creep.memory.recycle) {
			const spawn = this.creep.room.getFreeSpawn();
			if (!this.creep.pos.isNearTo(spawn.pos)) {
				this.creep.moveTo(spawn.pos);
			} else {
				spawn.recycleCreep(this.creep);
			}
			return;
		}
		if (!!this.creep.memory.storage || !!this.creep.memory.full || this.creep.bagFull) {
			const storage = Game.rooms[this.creep.memory.homeRoom].storage;
			if (!!storage && !this.creep.pos.isNearTo(storage.pos)) {
				// get in range
				this.moveTo(storage.pos);
				this.creep.say("Storage");
				this.creep.memory.storage = true;
			} else {
				if (this.creep.bagEmpty) {
					delete this.creep.memory.full;
					delete this.creep.memory.storage;
					this.creep.memory.recycle = true;
				} else {
					const status = this.creep.logTransfer(storage, this.getMineralTypeFromStore(this.creep));
					if (status === OK) {
						this.positionIterator = this.creep.memory.positionIterator = 0;
					}
				}
			}
		} else if (!this.moveUsingPositions(3)) {
			const powerBanks = this.creep.room.groupedStructures[STRUCTURE_POWER_BANK];
			if (!!powerBanks && powerBanks.length > 0) {
				if (this.creep.pos.getRangeTo(powerBanks[0]) > 6) {
					this.moveTo(powerBanks[0].pos);
				} else if (this.creep.pos.getRangeTo(powerBanks[0]) < 4) {
					this.moveTo(Game.rooms[this.creep.memory.homeRoom].storage.pos);
				} else {
					this.creep.say("Wait");
				}
			} else {
				let target = this.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {filter: (r: Resource) => r.resourceType === RESOURCE_POWER}) as Resource;
				if (!target) {
					target = this.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES) as Resource;
				}
				if (!!target && !this.creep.pos.isNearTo(target)) {
					// get in range
					this.moveTo(target.pos);
				} else if (!!target && this.creep.hits > (this.creep.hitsMax / 2)) {
					this.creep.pickup(target);
				} else {
					this.creep.memory.full = true;
				}
				this.creep.say("Collect");
			}
		} else {
			this.creep.say("Mup");
		}
	}

	public action(): boolean {
		this.move();
		return true;
	}
}
