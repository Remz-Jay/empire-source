import WarfareCreepAction from "../../../packages/warfare/warfareCreepAction";

export default class PowerHarvester extends WarfareCreepAction {
	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
	}

	public move() {
		if (!this.moveUsingPositions(1)) {
			const target = this.creep.pos.findClosestByRange(this.creep.room.groupedStructures[STRUCTURE_POWER_BANK]);
			const healer = _(this.safeLook(LOOK_CREEPS, this.creep.pos, 1)).map("creep").filter((c: Creep) => c.getActiveBodyparts(HEAL) > 0).first();
			if (!!target && !this.creep.pos.isNearTo(target)) {
				// get in range
				this.moveTo(target.pos);
			} else if (!!target && this.creep.hits > (this.creep.hitsMax / 2) && !!healer) {
				if (target.hits < (50 * 750)) {
					const mules = _.filter(this.creep.room.myCreeps, (c: Creep) => c.memory.role === "PowerMule");
					if (!mules || mules.length < 2) {
						// Don't break the PowerBank until we have mules present to prevent decay.
						return;
					}
				}
				this.creep.say("💪🏼", true);
				this.creep.attack(target);
			}
		}
	}

	public action(startCpu: number): boolean {
		this.startCpu = startCpu;
		this.move();
		return true;
	}
}
