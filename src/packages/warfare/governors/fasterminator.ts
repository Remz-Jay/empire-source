import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class FasterminatorGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Fasterminator";

	public maxParts = 15;
	public maxTough = 3;
	public maxCreeps = 5;
	public bodyPart = [RANGED_ATTACK, MOVE];
	public toughPart = [TOUGH, MOVE];
	public basePart = [HEAL, HEAL, HEAL, HEAL, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: FasterminatorGovernor.ROLE,
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
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		let remainingEnergy = this.room.energyCapacityAvailable - WarfareCreepGovernor.calculateRequiredEnergy(body);
		let numTough = _.floor(remainingEnergy / WarfareCreepGovernor.calculateRequiredEnergy(this.toughPart));
		if (numTough > this.maxTough) {
			numTough = this.maxTough;
		}
		for (let i = 0; i < numTough; i ++) {
			if (body.length + this.toughPart.length <= 50) {
				body = body.concat(this.toughPart);
			}
		}
		return WarfareCreepGovernor.sortBodyParts(body);
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}
}
