import {ICreepGovernor, CreepConfiguration, default as CreepGovernor, CreepProperties} from "../creepGovernor";
import * as SpawnManager from "../../spawns/spawnManager";
import * as Config from "../../../config/config";

export default class BuilderGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_BUILDER;
	public static ROLE: string = "Builder";
	public static MINRCL: number = Config.MINRCL_BUILDER;
	constructor(room: Room) {
		super(room);
	}
	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: SpawnManager.getFirstSpawn().id,
			role: BuilderGovernor.ROLE,
			target_construction_site_id: Object.keys(Game.constructionSites)[0],
			target_energy_source_id: SpawnManager.getFirstSpawn().id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let limit = _.ceil(Object.keys(Game.constructionSites).length / 4);
		return limit;
	}
}
