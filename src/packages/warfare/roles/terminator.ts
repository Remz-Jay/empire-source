import WarfareCreepAction from "../warfareCreepAction";

export default class Terminator extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Terminator";

	public static maxParts = 15;
	public static maxTough = 1;
	public static maxCreeps = 5;
	public static bodyPart = [RANGED_ATTACK, RANGED_ATTACK, MOVE];
	public static toughPart = [RANGED_ATTACK, MOVE];
	public static basePart = [HEAL, HEAL, MOVE];

	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public static getBody(room: Room) {
		return super.getToughBody(room);
	}

	public static getCreepLimit(room: Room): number {
		return this.maxCreeps;
	}

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
				target = this.findRangedTarget(this.sourceKeeperDuty) || this.findHealTarget() || this.findTargetStructure() || undefined;
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					delete this.creep.memory.target;
				}
			} else if (!this.noTarget) {
				target = Game.getObjectById<Creep>(this.creep.memory.target);
				if (!target || (!!target.my && target.hits === target.hitsMax)) { // target died or full health?
					target = this.findRangedTarget(this.sourceKeeperDuty);
					if (!!target) {
						this.creep.memory.target = target.id;
					} else {
						delete this.creep.memory.target;
					}
				} else if (target instanceof Structure) {
					// check if we have better things to do
					const t2 = this.findRangedTarget(this.sourceKeeperDuty);
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
				// const range = (target instanceof Creep && target.my) ? 1 : 3;
				const range = 1;
				if (!this.creep.pos.inRangeTo(target.pos, range)) { // move closer if we're out of RANGED_ATTACK range.
					this.moveTo(target.pos);
				}
			} else {
				if (this.sourceKeeperDuty) {
					const lairs = this.creep.room.groupedStructures[STRUCTURE_KEEPER_LAIR].filter(
						(s: StructureKeeperLair) => s.ticksToSpawn < 50
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
