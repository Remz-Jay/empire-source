import WarfareCreepAction from "../warfareCreepAction";

export interface IWarArcher {
	action(): boolean;
	move(): void;
}

export default class WarArcher extends WarfareCreepAction implements IWarArcher {
	public hasHealer: boolean = true;
	public hardPath: boolean = true;
	public noTarget: boolean = true;
	public sourceKeeperDuty: boolean = false;
	public boosts: string[] = [
		RESOURCE_CATALYZED_KEANIUM_ALKALIDE, // +300% rangedAttack and rangedMassAttack effectiveness
		RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, // +300% heal and rangedHeal effectiveness
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
	];

	public move(): void {
		if (!this.hasHealer && !this.moveToHeal() || !this.moveToSafeRange() || !!this.creep.memory.waitForHealth) {
			return;
		} else if (this.hasHealer && !this.checkTough()) {
			const closest = this.creep.pos.findClosestByRange(this.creep.room.myCreeps, {
				filter: (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(HEAL) > 5,
			});
			if (!!closest && !this.creep.pos.isNearTo(closest)) {
				// get in range
				this.creep.moveTo(closest);
				return;
			} else if (!!closest) {
				// stay in range
				this.creep.move(this.creep.pos.getDirectionTo(closest.pos));
				return;
			}
		}
		if (!this.moveUsingPositions()) {
			let target: Creep | Structure;
			if (!this.noTarget && !this.creep.memory.target) {
				target = this.findTarget() || this.findHealTarget() || this.findTargetStructure() || undefined;
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					delete this.creep.memory.target;
				}
			} else if (!this.noTarget) {
				target = Game.getObjectById<Creep>(this.creep.memory.target);
				if (!target || (!!target.my && target.hits === target.hitsMax)) { // target died or full health?
					target = this.findTarget();
					if (!!target) {
						this.creep.memory.target = target.id;
					} else {
						delete this.creep.memory.target;
					}
				} else if (target instanceof Structure) {
					// check if we have better things to do
					const t2 = this.findTarget();
					if (!!t2) {
						target = t2;
						this.creep.memory.target = target.id;
					}
				}
			}
			// Just moveTo when we're safely behind walls
			if (!!target && !this.hardPath) {
				this.creep.move(this.creep.pos.getDirectionTo(target));
				return;
			}

			// Otherwise, use a pathFinder path to get there.
			if (!!target && !!this.creep.memory.target && target.id === this.creep.memory.target) {
				const range = (target instanceof Creep && target.my) ? 1 : 3;
				if (!this.creep.pos.inRangeTo(target.pos, range)) { // move closer if we're out of RANGED_ATTACK range.
					this.moveTo(target.pos);
				}
			} else {
				if (this.creep.room.allConstructionSites.length > 0) {
					this.creep.moveTo(this.creep.room.allConstructionSites[0].pos);
				} else {
					// stay at the latest checkpoint
					this.creep.memory.positionIterator = this.positionIterator = (this.positions.length - 1);
				}
			}
		}
	}
	public action(): boolean {
		if (this.creep.room.name === this.creep.memory.homeRoom) {
			if (this.getBoosted()) {
				this.move();
			}
		} else if (!this.positions && this.creep.room.name !== this.creep.memory.config.targetRoom) {
			this.moveToTargetRoom();
		} else {
			// See: http://support.screeps.com/hc/en-us/articles/203137792-Simultaneous-execution-of-creep-actions
			if (this.heal()) {
				delete this.creep.memory.waitForHealth;
				if (!this.rangedAttack(true) || !this.rangedHeal() || !this.rangedStructureAttack(false) || !this.rangedPublicStructureAttack()) {
					this.creep.memory.inCombat = true;
				} else {
					delete this.creep.memory.inCombat;
				}
			} else {
				if (!this.rangedAttack(true) || !this.rangedStructureAttack(false) || !this.rangedPublicStructureAttack()) {
					this.creep.memory.inCombat = true;
				} else {
					delete this.creep.memory.inCombat;
				}
			}
			this.move();
		}
		return true;
	}
}
