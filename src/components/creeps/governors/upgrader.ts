import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";
import * as Config from "../../../config/config";

export default class UpgraderGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_UPGRADER;
	public static MINRCL: number = Config.MINRCL_UPGRADER;
	public static ROLE: string = "Upgrader";

	public maxParts = 8;
	public maxCreeps = 2;
	public bodyPart = [CARRY, MOVE, WORK, WORK];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let spawn = this.room.getFreeSpawn();
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			role: UpgraderGovernor.ROLE,
			target_controller_id: this.room.controller.id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let num: number;
		if (this.room.controller.level > 4) {
			num = _.floor(this.room.energyInContainers / 200000);
		} else if (this.room.controller.level < 5) {
			num = 2;
		} else {
			num = this.maxCreeps;
		}
		if (num > this.maxCreeps && this.room.controller.level > 4) {
			num = this.maxCreeps;
		}
		return (num > 0) ? num : 1;
	}

	public getBody() {
		if (this.room.name === "W7N44") {
			this.maxParts = 2;
		}
		return super.getBody();
	}
}
