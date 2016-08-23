import * as Config from "../../../config/config";
import AssimilationCreepGovernor from "../assimilationCreepGovernor";

export default class ASMRaiderGovernor extends AssimilationCreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_ASM_MULE;
	public static MINRCL: number = Config.MINRCL_ASM_MULE;
	public static ROLE: string = "ASMRaider";

	public bodyPart: string[] = [CARRY, MOVE];
	public maxParts: number = 25;
	public maxCreeps: number = 6;

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: this.spawn.name,
			role: ASMRaiderGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}
}
