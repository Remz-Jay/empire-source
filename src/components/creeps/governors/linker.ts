import {ICreepGovernor, CreepConfiguration, default as CreepGovernor, CreepProperties} from "../creepGovernor";
import * as SpawnManager from "../../spawns/spawnManager";
import * as RoomManager from "../../rooms/roomManager";
import * as Config from "../../../config/config";

export default class LinkerGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_LINKER;
	public static MINRCL: number = Config.MINRCL_LINKER;
	public static ROLE: string = "Linker";

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = [CARRY, MOVE];
		let name: string = null;
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: SpawnManager.getFirstSpawn().id,
			role: LinkerGovernor.ROLE,
			target_controller_id: this.room.controller.id,
			target_energy_source_id: SpawnManager.getFirstSpawn().id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let limit = 1;
		return limit;
	}
}
