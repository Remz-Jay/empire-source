import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class HealerGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "Healer";

	public maxParts = 12;
	public maxCreeps = 3;
	public bodyPart = [HEAL, HEAL, HEAL, MOVE];
	public basePart = [HEAL, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = `${this.room.name}-${HealerGovernor.ROLE}-${global.time}`;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: HealerGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getBody(): string[] {
		return super.getToughBody();
	}
}
