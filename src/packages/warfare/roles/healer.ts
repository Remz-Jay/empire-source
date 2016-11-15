import WarfareCreepAction from "../warfareCreepAction";

export default class Healer extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "Healer";

	public static maxParts = 12;
	public static maxCreeps = 3;
	public static bodyPart = [HEAL, HEAL, HEAL, MOVE];
	public static basePart = [HEAL, MOVE];

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
		// return super.getToughBody(room);
		// return [TOUGH, HEAL, MOVE]; // test dummy config
		return [
			TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE,
			HEAL, HEAL, HEAL, HEAL, MOVE, HEAL, HEAL, HEAL, HEAL, MOVE,
			HEAL, HEAL, HEAL, HEAL, MOVE, HEAL, HEAL, HEAL, HEAL, MOVE,
			HEAL, HEAL, HEAL, HEAL, MOVE, HEAL, HEAL, HEAL, HEAL, MOVE,
			HEAL, HEAL, HEAL, HEAL, MOVE, HEAL, HEAL, HEAL, HEAL, MOVE,
		];
	}
	public hardPath: boolean = true;
	public boosts: string[] = [
		RESOURCE_CATALYZED_GHODIUM_ALKALIDE, // -70% damage taken
		RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, // +300% heal and rangedHeal effectiveness
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
	];

	public move(): void {
		if (!this.moveUsingPositions()) {
			const closest = this.creep.pos.findClosestByRange(_.filter(this.creep.room.myCreeps, (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(WORK) > 1))
				|| this.creep.pos.findClosestByRange(_.filter(this.creep.room.myCreeps, (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(HEAL) < 6));
			if (!!closest && !this.creep.pos.isNearTo(closest)) {
				// get in range
				this.creep.moveTo(closest);
			} else if (!!closest) {
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
