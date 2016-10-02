import WarfareCreepAction from "../warfareCreepAction";

export interface IHealer {
	action(startCpu: number): boolean;
	move(): void;
}

export default class Healer extends WarfareCreepAction implements IHealer {

	public hardPath: boolean = true;
	public boosts: string[] = [
		RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, // +300% heal and rangedHeal effectiveness
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
	];

	public move(): void {
		if (!this.moveUsingPositions()) {
			const closest = this.creep.pos.findClosestByRange(_.filter(this.creep.room.myCreeps, (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(WORK) > 1))
				|| this.creep.pos.findClosestByRange(_.filter(this.creep.room.myCreeps, (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(HEAL) < 6));
			if (!!closest && !this.creep.pos.isNearTo(closest)) {
				// get in range
				this.creep.moveTo(closest);
			} else if (!!closest) {
				// stay in range
				this.creep.move(this.creep.pos.getDirectionTo(closest.pos));
			}
		}
	}

	public action(startCpu: number): boolean {
		this.startCpu = startCpu;
		if (this.creep.hits === this.creep.hitsMax) {
			delete this.creep.memory.waitForHealth;
		}
		if (this.heal(true)) { // Reverse targeting for Tanks.
			this.rangedHeal();
		}
		if (this.getBoosted()) {
			this.move();
		}
		return true;
	}
}
