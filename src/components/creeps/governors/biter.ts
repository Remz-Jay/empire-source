import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";

export default class BiterGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = global.PRIORITY_BITER;
	public static MINRCL: number = global.MINRCL_BITER;
	public static ROLE: string = "Biter";

	public bodyPart = [ATTACK, ATTACK, MOVE];
	public maxCreeps = 1;
	public maxParts = 9;

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${BiterGovernor.ROLE}-${global.time}`;
		const properties: CreepProperties = {
			homeRoom: this.room.name,
			role: BiterGovernor.ROLE,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return (this.room.hostileCreeps.length > 2) ? 1 : 0;
	}
}
