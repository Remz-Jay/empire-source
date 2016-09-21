import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class WarMuleGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "WarMule";

	public maxParts = 12;
	public maxCreeps = 3;
	public bodyPart = [CARRY, CARRY, CARRY, MOVE];
	public basePart = [CARRY, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: WarMuleGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
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
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return WarfareCreepGovernor.sortBodyParts(body);
	}
}
