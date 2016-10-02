import WarfareCreepAction from "../warfareCreepAction";

export interface IWarrior {
	action(startCpu: number): boolean;
}

export default class Warrior extends WarfareCreepAction implements IWarrior {
	public powerBankDuty: boolean = true;
	public boosts: string[] = [
		RESOURCE_CATALYZED_UTRIUM_ACID, // +300% attack effectiveness
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
	];
	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
	}

	public hacknslash() {
		let closestHostile: Creep | Structure = this.creep.pos.findClosestByRange<Creep>(this.creep.room.hostileCreeps);
		if (!!closestHostile) {
			if (this.creep.attack(closestHostile) === ERR_NOT_IN_RANGE) {
				this.moveTo(closestHostile.pos);
			}
		} else {
			closestHostile = this.creep.pos.findClosestByPath<Structure>(this.creep.room.hostileStructures, {
				filter: (s: Structure) => s.structureType === STRUCTURE_EXTENSION
				|| s.structureType === STRUCTURE_SPAWN
				|| s.structureType === STRUCTURE_TOWER,
				costCallback: this.creepCallback,
			});
			if (!!closestHostile) {
				if (this.creep.attack(closestHostile) === ERR_NOT_IN_RANGE) {
					this.moveTo(closestHostile.pos);
				}
			} else {
				this.waitAtFlag(this.creep.memory.config.targetRoom);
			}
		}
	}
	public move() {
		if (!this.moveUsingPositions()) {
			if (this.powerBankDuty) {
				const target = this.creep.pos.findClosestByRange(this.creep.room.allStructures, {filter: (s: Structure) => s.structureType === STRUCTURE_POWER_BANK });
				const healer = _(this.safeLook(LOOK_CREEPS, this.creep.pos, 1)).map("creep").filter((c: Creep) => c.getActiveBodyparts(HEAL) > 0).first();
				if (!!target && !this.creep.pos.isNearTo(target)) {
					// get in range
					this.moveTo(target.pos);
				} else if (!!target && this.creep.hits > (this.creep.hitsMax / 2) && !!healer) {
					if (target.hits < 10000) {
						const mules = _.filter(this.creep.room.myCreeps, (c: Creep) => c.memory.role === "WarMule");
						if (!mules || mules.length < 2) {
							// Don't break the PowerBank until we have mules present to prevent decay.
							return;
						}
					}
					this.creep.attack(target);
				}
			}
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
