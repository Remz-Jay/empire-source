import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";
import * as SourceManager from "../../sources/sourceManager";

export default class HarvesterGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = global.PRIORITY_HARVESTER;
	public static MINRCL: number = global.MINRCL_HARVESTER;
	public static ROLE: string = "Harvester";

	public emergency: boolean = SourceManager.isEmergency() || (this.getNumberOfCreepsInRole() < (this.getCreepLimit() / 2));
	public basePart: string[] = [CARRY, CARRY, MOVE];
	public bodyPart: string[] = [WORK, WORK, MOVE];
	public maxParts: number = 3;

	public getBody() {
		if (this.room.energyCapacityAvailable < 400) {
			return CreepGovernor.sortBodyParts([WORK, WORK, CARRY, MOVE]);
		}
		let numParts: number;
		if (this.getNumberOfCreepsInRole() > 0 && !this.emergency) {
			numParts = _.floor(
				(this.room.energyCapacityAvailable - CreepGovernor.calculateRequiredEnergy(this.basePart)) /
				CreepGovernor.calculateRequiredEnergy(this.bodyPart));
		} else {
			this.bodyPart = [WORK, CARRY, MOVE];
			numParts = _.floor((this.room.energyAvailable) / CreepGovernor.calculateRequiredEnergy(this.bodyPart));
		}
		if (numParts > this.maxParts) {
			numParts = this.maxParts;
		}
		if (numParts < 1) {
			numParts = 1;
		}
		let body: string[] = this.basePart;
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return CreepGovernor.sortBodyParts(body);
	}
	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let spawn = this.room.getFreeSpawn();
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			role: HarvesterGovernor.ROLE,
			target_energy_dropoff_id: spawn.id,
			target_source_id: SourceManager.getFirstSource().id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return SourceManager.getNumberOfRequiredHarvesters();
	}
}
