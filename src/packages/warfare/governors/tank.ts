import * as Config from "../../../config/config";
import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class TankGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = Config.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Tank";

	public maxParts = 5;
	public maxCreeps = 2;
	public bodyPart = [TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: TankGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}
}
