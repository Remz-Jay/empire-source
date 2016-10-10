import {default as CreepGovernor} from "../creepGovernor";

export default class MinerGovernor extends CreepGovernor {

	public static PRIORITY: number = global.PRIORITY_MINER;
	public static MINRCL: number = global.MINRCL_MINER;
	public static ROLE: string = "Miner";

	public bodyPart: string[] = [WORK, WORK, CARRY, MOVE];
	public maxParts: number = 12;
	public maxCreeps: number = 1;

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${MinerGovernor.ROLE}-${global.time}`;
		const properties: CreepProperties = {
			homeRoom: this.room.name,
			role: MinerGovernor.ROLE,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		// Look for Mineral sources that have minerals left and have an extractor.
		return (this.room.minerals.filter((m: Mineral) => m.mineralAmount > 0
			&& m.pos.lookFor(LOOK_STRUCTURES).length > 0).length > 0) ? this.maxCreeps : 0;
	}
}
