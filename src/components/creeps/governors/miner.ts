import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";
import * as SpawnManager from "../../spawns/spawnManager";
import * as Config from "../../../config/config";

export default class MinerGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_MINER;
	public static MINRCL: number = Config.MINRCL_MINER;
	public static ROLE: string = "Miner";

	public bodyPart: string[] = [WORK, WORK, CARRY, MOVE];
	public maxParts: number = 4;
	public maxCreeps: number = 1;
	public getBody() {
		let numParts: number;
		numParts = _.floor((this.room.energyCapacityAvailable) / CreepGovernor.calculateRequiredEnergy(this.bodyPart));
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
			role: MinerGovernor.ROLE,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return (this.room.find(FIND_STRUCTURES, {filter: (s: Structure) => s.structureType === STRUCTURE_EXTRACTOR}).length > 0) ? this.maxCreeps : 0;
	}
}
