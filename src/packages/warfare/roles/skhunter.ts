import WarfareCreepAction from "../warfareCreepAction";

export default class SKHunter extends WarfareCreepAction {

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

	public sourceKeeperDuty: boolean = true;

	public move(): void {
		if (!this.moveToSafeRange()) {
			return;
		}
		let target: Creep | Structure;
		if (!this.creep.memory.target) {
			target = this.findRangedTarget(this.sourceKeeperDuty) || this.findHealTarget(true) || undefined;
			if (!!target) {
				this.creep.memory.target = target.id;
			} else {
				delete this.creep.memory.target;
			}
		} else {
			target = Game.getObjectById<Creep>(this.creep.memory.target);
			if (!target || (!!target.my && target.hits === target.hitsMax) || target.room.name !== this.creep.room.name) { // target died or full health?
				target = this.findRangedTarget(this.sourceKeeperDuty);
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					delete this.creep.memory.target;
				}
			}
		}
		if (!!target) {
			if (!!target.my) {
				this.moveTo(target.pos); // stay in heal range
			} else {
				const range = (target instanceof Creep && target.getActiveBodyparts(ATTACK) > 1) ? 3 : 1;
				if (!this.creep.pos.inRangeTo(target.pos, range)) { // move closer if we're out of RANGED_ATTACK range.
					this.moveTo(target.pos);
				}
			}
		} else {
			const lair = _(this.creep.room.groupedStructures[STRUCTURE_KEEPER_LAIR])
				.filter((s: StructureKeeperLair) => !!s.pos.findInRange(this.creep.room.sources, 5))
				.sortBy("ticksToSpawn")
				.first();
			if (!!lair) {
				if (!this.creep.pos.inRangeTo(lair.pos, 3)) {
					this.moveTo([{pos: lair.pos, range: 3}]);
				}
			} else {
				this.waitAtFlag(this.creep.memory.config.targetRoom);
			}
		}
	}
	public rotation(): void {
		// See: http://support.screeps.com/hc/en-us/articles/203137792-Simultaneous-execution-of-creep-actions
		if (this.heal()) {
			if (this.rangedAttack(true)) {
				this.rangedHeal();
			}
		} else {
			this.rangedAttack(true);
		}
	}
	public action(): boolean {
		if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
			this.rotation();
			this.moveToTargetRoom();
		} else {
			this.rotation();
			this.move();
		}
		return true;
	}
}
