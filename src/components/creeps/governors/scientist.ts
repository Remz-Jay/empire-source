import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";

export default class ScientistGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = global.PRIORITY_SCIENTIST;
	public static MINRCL: number = global.MINRCL_SCIENTIST;
	public static ROLE: string = "Scientist";

	public bodyPart = [CARRY, MOVE];
	public maxCreeps = 1;
	public maxParts = 4;

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			role: ScientistGovernor.ROLE,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return (this.room.myLabs.length < 3) ? 0 : this.maxCreeps;
	}
}
