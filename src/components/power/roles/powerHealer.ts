import WarfareCreepAction from "../../../packages/warfare/warfareCreepAction";

export default class PowerHealer extends WarfareCreepAction  {

	public move(): void {
		if (!this.moveUsingPositions()) {
			const closest = this.creep.pos.findClosestByRange(_.filter(this.creep.room.myCreeps,
				(c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(ATTACK) > 1))
				|| this.creep.pos.findClosestByRange(_.filter(this.creep.room.myCreeps, (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(HEAL) < 6)
			);
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
		if (this.heal(true)) { // Reverse targeting for Tanks.
			this.rangedHeal();
		}
		this.move();
		return true;
	}
}
