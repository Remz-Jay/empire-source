import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class WarvesterGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Warvester";

	public maxParts = 25;
	public maxCreeps = 3;
	public bodyPart = [CARRY, MOVE];
	public toughPart = [TOUGH, TOUGH, MOVE];
	public basePart = [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: WarvesterGovernor.ROLE,
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
