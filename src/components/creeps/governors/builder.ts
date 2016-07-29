import {ICreepGovernor, CreepConfiguration, default as CreepGovernor, CreepProperties} from "../creepGovernor";
import * as SpawnManager from "../../spawns/spawnManager";

export default class BuilderGovernor extends CreepGovernor implements ICreepGovernor {
	public role = "Builder";

	public getCreepConfig():CreepConfiguration {
		let bodyParts:string[] = [MOVE, MOVE, CARRY, WORK];
		let name:string = null;
		let properties:CreepProperties = {
			renew_station_id: SpawnManager.getFirstSpawn().id,
			role: this.role,
			target_construction_site_id: Object.keys(Game.constructionSites)[0],
			target_energy_source_id: SpawnManager.getFirstSpawn().id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit():number {
		let limit = _.ceil(Object.keys(Game.constructionSites).length / 3);
		return limit;
	}
}
