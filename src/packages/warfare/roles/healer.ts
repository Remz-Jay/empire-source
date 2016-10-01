import WarfareCreepAction from "../warfareCreepAction";

export interface IHealer {
	action(): boolean;
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
			let closest = this.creep.pos.findClosestByRange(this.creep.room.myCreeps, {
				filter: (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(WORK) > 1,
			});
			if (!closest) {
				closest = this.creep.pos.findClosestByRange(this.creep.room.myCreeps, {
					filter: (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(HEAL) < 6,
				});
			}
			if (!!closest && !this.creep.pos.isNearTo(closest)) {
				this.creep.say('MTC');
				// get in range
				this.creep.moveTo(closest);
			} else if (!!closest) {
				this.creep.say('SWC');
				// stay in range
				this.creep.move(this.creep.pos.getDirectionTo(closest.pos));
			}
		}
	}

	public action(): boolean {
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
