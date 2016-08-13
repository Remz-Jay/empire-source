import * as Config from "../../../config/config";
import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class TerminatorGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = Config.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Terminator";

	public maxParts = 10;
	public maxCreeps = 2;
	public bodyPart = [RANGED_ATTACK, RANGED_ATTACK, MOVE];
	public basePart = [HEAL, HEAL, HEAL, ATTACK, ATTACK, ATTACK, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: this.spawn.name,
			role: TerminatorGovernor.ROLE,
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
		return WarfareCreepGovernor.sortBodyParts(body);
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}
}
