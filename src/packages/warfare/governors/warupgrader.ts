import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class WarUpgraderGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "WarUpgrader";

	public maxParts = 12;
	public maxCreeps = 1;
	public bodyPart = [WORK, WORK, CARRY, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: WarUpgraderGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}
}