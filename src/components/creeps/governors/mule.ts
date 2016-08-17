import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";
import * as SpawnManager from "../../spawns/spawnManager";
import * as Config from "../../../config/config";

export default class MuleGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_MULE;
	public static MINRCL: number = Config.MINRCL_MULE;
	public static ROLE: string = "Mule";

	public bodyPart = [CARRY, MOVE];
	public maxParts = 15;
	public maxCreeps = 2;
	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: SpawnManager.getFirstSpawn().name,
			role: MuleGovernor.ROLE,
			target_controller_id: this.room.controller.id,
			target_energy_source_id: SpawnManager.getFirstSpawn().id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getBody(): string[] {
		let numParts: number;
		if (this.getNumberOfCreepsInRole() > 0 && !this.emergency) {
			numParts = _.floor((this.room.energyCapacityAvailable) / CreepGovernor.calculateRequiredEnergy(this.bodyPart));
		} else {
			numParts = _.floor((this.room.energyAvailable) / CreepGovernor.calculateRequiredEnergy(this.bodyPart));
		}
		if (numParts < 3) {
			numParts = 3;
		}
		if (this.maxParts > 3 && numParts > this.maxParts) {
			numParts = this.maxParts;
		}
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return CreepGovernor.sortBodyParts(body);
	}

	public getCreepLimit(): number {
		if (this.room.containers.length > 0) {
			if (this.getCreepsInRole().length < 1 || (this.room.energyInContainers + this.room.energyAvailable)  < (this.room.energyCapacityAvailable * 0.8)) {
				this.emergency = true;
				this.maxCreeps = 3;
			}
			if (this.maxCreeps > this.room.containers.length) {
				this.maxCreeps = this.room.containers.length;
			}
			return (this.room.controller.level < 3) ? 1 : this.maxCreeps;
		} else {
			return 0;
		}

	};
}
