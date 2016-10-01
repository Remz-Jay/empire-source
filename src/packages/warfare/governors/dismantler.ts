import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class DismantlerGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Dismantler";

	public maxParts = 20;
	public maxCreeps = 2;
	public bodyPart = [WORK, WORK, WORK, MOVE];
	public toughPart = [TOUGH, MOVE];
	public basePart = [TOUGH, TOUGH, TOUGH, MOVE];

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${DismantlerGovernor.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: DismantlerGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}
	public getBody(): string[] {
		return super.getToughBody();
	}
}
