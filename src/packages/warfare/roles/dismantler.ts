import WarfareCreepAction from "../warfareCreepAction";

export default class Dismantler extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Dismantler";

	public static maxParts = 8;
	public static maxCreeps = 2;
	public static bodyPart = [WORK, WORK, WORK, WORK, MOVE];
	public static toughPart = [TOUGH, MOVE];
	public static basePart = [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, TOUGH, TOUGH, TOUGH, TOUGH, MOVE];

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
	public static getBody(room: Room): string[] {
		return super.getToughBody(room);
		// return [TOUGH, WORK, MOVE]; // Test dummy config
	}

	public noTarget: boolean = true;
	public hasHealer: boolean = true;
	public hardPath: boolean = true;
	public freeForAll: boolean = false;

	public boosts: string[] = [
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
		RESOURCE_CATALYZED_ZYNTHIUM_ACID, // +300% dismantle effectiveness
		RESOURCE_CATALYZED_GHODIUM_ALKALIDE, // -70% damage taken
	];

	public dismantleTarget(target: Structure): void {
		if (!this.creep.pos.isNearTo(target)) {
			this.creep.moveTo(target);
		} else {
			this.creep.dismantle(target);
			if (Game.time & 5) {
				this.creep.say("OM NOM", true);
			} else if (Game.time & 6) {
				this.creep.say("NOM!", true);
			}
		}
	}

	public dismantle(): boolean {
		if (!this.positions) {
			return false;
		}
		if (this.positionIterator < this.positions.length && this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
			const structure = _(this.creep.room.lookForAt<Structure>(LOOK_STRUCTURES, this.positions[this.positionIterator])).first() as OwnedStructure;
			if (!!structure && !structure.my && structure.structureType !== STRUCTURE_PORTAL) {
				this.creep.dismantle(structure);
				return false;
			}
		} else if (this.freeForAll) {
			const movingTarget: Structure = _(this.creep.safeLook(LOOK_STRUCTURES, 1)).map("structure").filter(
				(s: Structure) => s instanceof OwnedStructure && !s.my
			).sortBy("hits").first() as Structure;
			if (!!movingTarget) {
				this.creep.dismantle(movingTarget);
			}
		} else if (!this.noTarget && this.positionIterator >= this.positions.length) {
			let target = this.findTargetStructure();
			if (!!target) {
				this.dismantleTarget(target);
				return false;
			} else if (!!this.creep.room.my) {
				target =  this.creep.room.weakestWall;
				this.dismantleTarget(target);
			}
		}
		return true;
	}

	public move(): boolean {
		if (this.hasHealer && (!!this.creep.stats.fullHealth.toughParts && !this.creep.stats.current.toughParts)) {
			const closest = this.creep.pos.findClosestByRange(this.creep.room.myCreeps, {
				filter: (c: Creep) => c.id !== this.creep.id && c.stats.current.heal > 5 * HEAL_POWER,
			});
			if (!!closest && !this.creep.pos.isNearTo(closest)) {
				// get in range
				this.creep.moveTo(closest);
				return false;
			} else if (!!closest) {
				// stay in range
				this.creep.move(this.creep.pos.getDirectionTo(closest.pos));
				return false;
			}
		} else {
			if (!this.positions) {
				return false;
			}
			return this.moveUsingPositions(1);
		}
	}

	public action(): boolean {
		if (!this.getBoosted()) {
			return false;
		}
		if (this.creep.hits === this.creep.hitsMax && !!this.creep.memory.waitForHealth) {
			delete this.creep.memory.waitForHealth;
		}
		if (!this.positions && this.creep.room.name !== this.creep.memory.config.targetRoom) {
				this.moveToTargetRoom();
		} else {
			if (this.dismantle()) {
				this.move();
			}
		}
		return true;
	}
}
