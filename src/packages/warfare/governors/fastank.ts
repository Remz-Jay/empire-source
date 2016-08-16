import * as Config from "../../../config/config";
import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class FastankGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = Config.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Fastank";

	public maxParts = 20;
	public maxCreeps = 2;
	public basePart = [TOUGH, MOVE];
	public toughPart = [TOUGH, MOVE];
	public bodyPart = [ATTACK, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: this.spawn.name,
			role: FastankGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getBody() {
		let numParts = _.floor(
			(this.room.energyCapacityAvailable - WarfareCreepGovernor.calculateRequiredEnergy(this.basePart)) /
			WarfareCreepGovernor.calculateRequiredEnergy(this.bodyPart));

		if (numParts > this.maxParts) {
			numParts = this.maxParts;
		}
		let body: string[] = this.basePart;
		for (let i = 0; i < numParts; i++) {
			body = body.concat(this.bodyPart);
		}
		let remainingEnergy = this.room.energyCapacityAvailable - WarfareCreepGovernor.calculateRequiredEnergy(body);
		let numTough = _.floor(remainingEnergy / WarfareCreepGovernor.calculateRequiredEnergy(this.toughPart));
		for (let i = 0; i < numTough; i ++) {
			body = body.concat(this.toughPart);
		}
		return WarfareCreepGovernor.sortBodyParts(body);
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}
}