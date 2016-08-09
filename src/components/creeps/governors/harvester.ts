import {ICreepGovernor, CreepConfiguration, default as CreepGovernor, CreepProperties} from "../creepGovernor";
import * as SourceManager from "../../sources/sourceManager";
import * as SpawnManager from "../../spawns/spawnManager";
import * as Config from "../../../config/config";

export default class HarvesterGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_HARVESTER;
	public static MINRCL: number = Config.MINRCL_HARVESTER;
	public static ROLE: string = "Harvester";

	public emergency: boolean = SourceManager.isEmergency() || (this.getNumberOfCreepsInRole() < (this.getCreepLimit() / 2));
	public bodyPart: string[] = [WORK, WORK, CARRY, MOVE];
	public maxParts: number = 4;
	public getBody() {
		if (this.room.containers.length < 1) {
			// no containers, so this creep will have to leg it.
			this.bodyPart = [WORK, MOVE, CARRY, MOVE];
		}
		let numParts: number;

		if (this.getNumberOfCreepsInRole() > 0 && !this.emergency) {
			numParts = _.floor((this.room.energyCapacityAvailable) / CreepGovernor.calculateRequiredEnergy(this.bodyPart));
		} else {
			numParts = _.floor((this.room.energyAvailable) / CreepGovernor.calculateRequiredEnergy(this.bodyPart));
		}
		if (numParts < 1) {
			numParts = 1;
		}
		if (this.maxParts > 1 && numParts > this.maxParts) {
			numParts = this.maxParts;
		}
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			body = body.concat(this.bodyPart);
		}
		return CreepGovernor.sortBodyParts(body);
	}
	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: SpawnManager.getFirstSpawn().name,
			role: HarvesterGovernor.ROLE,
			target_energy_dropoff_id: SpawnManager.getFirstSpawn().id,
			target_source_id: SourceManager.getFirstSource().id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return SourceManager.getNumberOfRequiredHarvesters();
	}
}
