import WarfareCreepAction from "../warfareCreepAction";

export default class Warrior extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Warrior";

	public static maxParts = 12;
	public static maxCreeps = 2;
	public static bodyPart = [ATTACK, ATTACK, ATTACK, MOVE];
	public static basePart = [TOUGH, MOVE]; // TODO: 8x TOUGH = optimized for powerSpawns

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
	}

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
				const target = this.creep.pos.findClosestByRange(this.creep.room.groupedStructures[STRUCTURE_POWER_BANK]);
				const healer = _(this.creep.safeLook(LOOK_CREEPS, 1)).map("creep").filter((c: Creep) => c.hasActiveBodyPart(HEAL)).first();
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
					this.creep.say("💪🏼", true);
					this.creep.attack(target);
				}
			}
		}
	}

	public action(): boolean {
		if (this.getBoosted()) {
			this.move();
		}
		return true;
	}
}
