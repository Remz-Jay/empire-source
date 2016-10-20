import WarfareCreepAction from "../../../packages/warfare/warfareCreepAction";

export default class PowerHarvester extends WarfareCreepAction {
	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "PowerHarvester";

	public static maxParts: number = 16;
	public static maxTough: number = 0;
	public static maxCreeps: number = 1;
	public static bodyPart: string[] = [ATTACK, ATTACK, MOVE];
	public static basePart: string[] = [ATTACK, MOVE];
	public static toughPart: string[] = [];

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

	public boosts: string[] = [
		RESOURCE_ZYNTHIUM_OXIDE, // +100% fatigue decrease speed
	];

	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
	}

	public move() {
		if (!this.moveUsingPositions(1)) {
			const target = this.creep.pos.findClosestByRange(this.creep.room.groupedStructures[STRUCTURE_POWER_BANK]);
			const healer = _(this.creep.safeLook(LOOK_CREEPS, 1)).map("creep").filter((c: Creep) => c.getActiveBodyparts(HEAL) > 0).first();
			if (!!target && !this.creep.pos.isNearTo(target)) {
				// get in range
				this.moveTo(target.pos);
			} else if (!!target && this.creep.hits > (this.creep.hitsMax / 2) && !!healer) {
				if (target.hits < (50 * 990)) {
					const mules = _.filter(this.creep.room.myCreeps, (c: Creep) => c.memory.role === "PowerMule");
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

	public action(): boolean {
		if (this.getBoosted()) {
			this.move();
		}
		return true;
	}
}
