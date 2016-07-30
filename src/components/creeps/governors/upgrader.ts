import {ICreepGovernor, CreepConfiguration, default as CreepGovernor, CreepProperties} from "../creepGovernor";
import * as SpawnManager from "../../spawns/spawnManager";
import * as RoomManager from "../../rooms/roomManager";
import * as Config from "../../../config/config";

export default class UpgraderGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_UPGRADER;
	public static ROLE: string = "Upgrader";

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = [MOVE, MOVE, CARRY, WORK];
		let name: string = null;
		let properties: CreepProperties = {
			renew_station_id: SpawnManager.getFirstSpawn().id,
			role: UpgraderGovernor.ROLE,
			target_controller_id: RoomManager.getFirstRoom().controller.id,
			target_energy_source_id: SpawnManager.getFirstSpawn().id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let limit = 2;
		return limit;
	}
}
