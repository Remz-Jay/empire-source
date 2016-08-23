import * as Config from "../../../config/config";
import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class RangerGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_WF_RANGER;
	public static MINRCL: number = Config.MINRCL_WF_RANGER;
	public static ROLE: string = "Ranger";

	public maxParts = 10;
	public maxCreeps = 2;
	public bodyPart = [TOUGH, MOVE, RANGED_ATTACK, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: RangerGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}
}
