import {ICreepGovernor, CreepConfiguration, default as CreepGovernor, CreepProperties} from "../creepGovernor";
import * as SourceManager from "../../sources/sourceManager";
import * as SpawnManager from "../../spawns/spawnManager";
import * as Config from "../../../config/config";

export default class HarvesterGovernor extends CreepGovernor implements ICreepGovernor {
    public role = "Harvester";

    public getCreepConfig(): CreepConfiguration {
        let bodyParts: string[] = [MOVE, MOVE, CARRY, WORK];
        let name: string = null;
        let properties: CreepProperties = {
            renew_station_id: SpawnManager.getFirstSpawn().id,
            role: this.role,
            target_energy_dropoff_id: SpawnManager.getFirstSpawn().id,
            target_source_id: SourceManager.getFirstSource().id,
        };
        return {body: bodyParts, name: name, properties: properties};
    }
    public getCreepLimit(): number {
        return Config.MAX_HARVESTERS_PER_SOURCE;
    }
}
