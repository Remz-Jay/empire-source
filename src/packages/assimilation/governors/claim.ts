import * as Config from "../../../config/config";
import AssimilationCreepGovernor from "../assimilationCreepGovernor";

export default class ClaimGovernor extends AssimilationCreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_ASM_CLAIM;
	public static MINRCL: number = Config.MINRCL_ASM_CLAIM;
	public static ROLE: string = "Claim";

	public maxParts = 6;
	public maxCreeps = 1;
	public bodyPart = [CLAIM, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: this.spawn.name,
			role: ClaimGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let num: number;
		if (this.room.controller.level > 4) {
			num = _.floor(this.room.energyInContainers / 10000);
		} else if (this.room.controller.level < 3) {
			num = 1;
		} else {
			num = this.maxCreeps;
		}
		if (num > this.maxCreeps) {
			num = this.maxCreeps;
		}
		return (num > 0) ? num : 1;
	}
}
