import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class WarvesterGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Warvester";

	public maxParts = 25;
	public maxCreeps = 3;
	public bodyPart = [CARRY, MOVE];
	public toughPart = [TOUGH, TOUGH, MOVE];
	public basePart = [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = `${this.room.name}-${WarvesterGovernor.ROLE}-${global.time}`;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: WarvesterGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getBody() {
		return super.getToughBody();
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}
}
