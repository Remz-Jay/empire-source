import {ICreepGovernor, CreepConfiguration, default as CreepGovernor, CreepProperties} from "../creepGovernor";
import * as SpawnManager from "../../spawns/spawnManager";
import * as RoomManager from "../../rooms/roomManager";
import * as Config from "../../../config/config";

export default class MuleGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_MULE;
	public static ROLE: string = "Mule";

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = [CARRY, MOVE];
		let name: string = null;
		let properties: CreepProperties = {
			renew_station_id: SpawnManager.getFirstSpawn().id,
			role: MuleGovernor.ROLE,
			target_controller_id: RoomManager.getFirstRoom().controller.id,
			target_energy_source_id: SpawnManager.getFirstSpawn().id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let limit = 1;
		return limit;
	}
}
