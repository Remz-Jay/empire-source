import WarfareCreepAction from "../warfareCreepAction";

export interface ITerminator {
	action(): boolean;
	move(): void;
	rotation(): void;
}

export default class Terminator extends WarfareCreepAction implements ITerminator {

	public hardPath: boolean = true;
	public noTarget: boolean = false;
	public sourceKeeperDuty: boolean = false;

	public move(): void {
		if (!this.moveToHeal() || !this.moveToSafeRange() || !!this.creep.memory.waitForHealth) {
			return;
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
				if (this.sourceKeeperDuty) {
					const lairs = this.creep.room.allStructures.filter(
						(s: StructureKeeperLair) => s.structureType === STRUCTURE_KEEPER_LAIR
						&& s.ticksToSpawn < 50
						&& (s.pos.findInRange(this.creep.room.sources, 5).length > 0)
					);
					if (lairs.length > 0) {
						if (!this.creep.pos.inRangeTo(lairs[0].pos, 4)) {
							this.moveTo([{pos: lairs[0].pos, range: 4}]);
						} else {
							// this.creep.cancelOrder("move");
							if (_.random(0, 10) === 1) {
								this.creep.say("Come out!", true);
							}
						}
					} else {
						this.waitAtFlag(this.creep.memory.config.targetRoom);
					}
				} else {
					this.waitAtFlag(this.creep.memory.config.targetRoom);
				}
			}
		}
	}
	public rotation(): void {
		// See: http://support.screeps.com/hc/en-us/articles/203137792-Simultaneous-execution-of-creep-actions
		if (this.heal()) {
			delete this.creep.memory.waitForHealth;
			if (!this.rangedAttack(true) || !this.rangedHeal() || !this.rangedStructureAttack() || !this.rangedPublicStructureAttack()) {
				this.creep.memory.inCombat = true;
			} else {
				delete this.creep.memory.inCombat;
			}
		} else {
			if (!this.rangedAttack(true) || !this.rangedStructureAttack() || !this.rangedPublicStructureAttack()) {
				this.creep.memory.inCombat = true;
			} else {
				delete this.creep.memory.inCombat;
			}
		}
	}
	public action(): boolean {
		if (!this.positions && this.creep.room.name !== this.creep.memory.config.targetRoom) {
			this.rotation();
			this.moveToTargetRoom();
		} else {
			this.rotation();
			this.move();
		}
		return true;
	}
}
