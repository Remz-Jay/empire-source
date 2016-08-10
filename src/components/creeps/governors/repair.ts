import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";
import * as SpawnManager from "../../spawns/spawnManager";
import * as Config from "../../../config/config";

export default class RepairGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_REPAIR;
	public static MINRCL: number = Config.MINRCL_REPAIR;
	public static ROLE: string = "Repair";

	public bodyPart = [CARRY, CARRY, WORK, MOVE, MOVE, MOVE];
	public maxParts = 4;
	public maxCreeps = 2;
	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: SpawnManager.getFirstSpawn().name,
			role: RepairGovernor.ROLE,
			target_controller_id: this.room.controller.id,
			target_energy_source_id: SpawnManager.getFirstSpawn().id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let num: number;
		if (this.room.controller.level < 4) {
			num = 1;
		} else {
			num = _.floor(this.room.energyInContainers / 30000);
		}

		return (num > 0) ? num : 0;
	};
}
