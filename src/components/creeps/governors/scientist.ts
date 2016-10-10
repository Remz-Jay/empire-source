import {default as CreepGovernor} from "../creepGovernor";

export default class ScientistGovernor extends CreepGovernor {

	public static PRIORITY: number = global.PRIORITY_SCIENTIST;
	public static MINRCL: number = global.MINRCL_SCIENTIST;
	public static ROLE: string = "Scientist";

	public bodyPart = [CARRY, CARRY, MOVE];
	public maxCreeps = 1;
	public maxParts = 2;

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${ScientistGovernor.ROLE}-${global.time}`;
		const properties: CreepProperties = {
			homeRoom: this.room.name,
			role: ScientistGovernor.ROLE,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return (_.union(this.room.myLabs, this.room.boostLabs).length < 3) ? 0 : this.maxCreeps;
	}
	public getBody(): string[] {
		if (this.room.controller.level === 8) {
			this.maxParts = 4;
		}
		return super.getBody();
	}
}
