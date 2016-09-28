import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class WarArcherGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "WarArcher";

	public maxParts = 15;
	public maxTough = 2;
	public maxCreeps = 5;
	public bodyPart = [RANGED_ATTACK, RANGED_ATTACK, MOVE];
	public toughPart = [TOUGH, TOUGH, MOVE];
	public basePart = [HEAL, HEAL, HEAL, HEAL, TOUGH, TOUGH, MOVE, MOVE, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: WarArcherGovernor.ROLE,
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
