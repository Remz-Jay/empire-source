import WarfareCreepAction from "../warfareCreepAction";

export default class Sentinel extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Sentinel";

	public static maxParts = 6;
	public static maxTough = 3;
	public static maxCreeps = 5;
	public static bodyPart = [RANGED_ATTACK, MOVE];
	public static toughPart = [TOUGH, MOVE];
	public static basePart = [HEAL, HEAL, HEAL, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];

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

	public move(): void {
		if (!this.moveToHeal() || !this.moveToSafeRange() || !!this.creep.memory.waitForHealth) {
			return;
		}
		let target: Creep;
		if (!this.creep.memory.target) {
			target = this.findRangedTarget() || this.findHealTarget() || undefined;
			if (!!target) {
				this.creep.memory.target = target.id;
			} else {
				delete this.creep.memory.target;
			}
		} else {
			target = Game.getObjectById<Creep>(this.creep.memory.target);
			if (!target || (!!target.my && target.hits === target.hitsMax) || target.room.name !== this.creep.room.name) { // target died or full health?
				target = this.findRangedTarget();
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					delete this.creep.memory.target;
				}
			}
		}

		// Otherwise, use a pathFinder path to get there.
		if (!!target) {
			if (!!target.my) {
				this.moveTo(target.pos); // stay in heal range
			} else {
				const range = (target instanceof Creep && target.stats.current.attack > this.creep.stats.current.heal) ? 3 : 1;
				if (!this.creep.pos.inRangeTo(target.pos, range)) { // move closer if we're out of RANGED_ATTACK range.
					this.moveTo(target.pos);
				}
			}
		} else {
			this.waitAtFlag(this.creep.memory.config.targetRoom);
		}
	}
	public rotation(): void {
		// See: http://support.screeps.com/hc/en-us/articles/203137792-Simultaneous-execution-of-creep-actions
		if (this.heal()) {
			delete this.creep.memory.waitForHealth;
			if (this.rangedAttack(true)) {
				this.rangedHeal();
			}
		} else {
			this.rangedAttack(true);
		}
	}
	public action(): boolean {
		if (!this.positions && this.creep.room.name !== this.creep.memory.config.targetRoom) {
			this.rotation();
			this.moveToTargetRoom();
		} else {
			this.rotation();
			if (!this.moveUsingPositions()) {
				this.move();
			}
		}
		return true;
	}
}
