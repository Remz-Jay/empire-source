import {default as CreepGovernor} from "../creepGovernor";

export default class DismantlerGovernor extends CreepGovernor {

	public static PRIORITY: number = global.PRIORITY_DISMANTLER;
	public static MINRCL: number = global.MINRCL_DISMANTLER;
	public static ROLE: string = "Dismantler";

	public bodyPart = [CARRY, CARRY, WORK, MOVE];
	public maxParts = 12;
	public maxCreeps = 1;
	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${DismantlerGovernor.ROLE}-${global.time}`;
		const spawn = this.room.getFreeSpawn();
		const properties: CreepProperties = {
			homeRoom: this.room.name,
			role: DismantlerGovernor.ROLE,
			target_controller_id: this.room.controller.id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		const dismantleFlags = this.room.flags.filter((f: Flag) => f.color === COLOR_YELLOW && f.secondaryColor === COLOR_ORANGE);
		return (dismantleFlags.length > 0) ? 1 : 0;
	};
}
