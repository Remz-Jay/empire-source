import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class TerminatorGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Terminator";

	public maxParts = 10;
	public maxCreeps = 2;
	public bodyPart = [RANGED_ATTACK, RANGED_ATTACK, MOVE];
	public toughPart = [TOUGH, TOUGH, MOVE];
	public basePart = [HEAL, HEAL, HEAL, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = `${this.room.name}-${TerminatorGovernor.ROLE}-${global.time}`;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: TerminatorGovernor.ROLE,
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
