import * as Config from "../../../config/config";
import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class HealerGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_WF_HEALER;
	public static MINRCL: number = Config.MINRCL_WF_HEALER;
	public static ROLE: string = "Healer";

	public maxParts = 10;
	public maxCreeps = 2;
	public bodyPart = [HEAL, HEAL, MOVE, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: this.spawn.name,
			role: HealerGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}
}
