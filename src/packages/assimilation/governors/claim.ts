import * as Config from "../../../config/config";
import AssimilationCreepGovernor from "../assimilationCreepGovernor";

export default class ClaimGovernor extends AssimilationCreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_ASM_CLAIM;
	public static MINRCL: number = Config.MINRCL_ASM_CLAIM;
	public static ROLE: string = "Claim";

	public claim: boolean = false;
	public maxParts = 5;
	public maxCreeps = 1;
	public bodyPart = [CLAIM, MOVE];

	constructor(homeRoom: Room, config: RemoteRoomConfig, claim: boolean = false) {
		super(homeRoom, config);
		this.claim = claim;
	}

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: ClaimGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getBody() {
		if (this.claim) {
			return  AssimilationCreepGovernor.sortBodyParts([CLAIM, TOUGH, MOVE, MOVE, MOVE, MOVE]);
		}
		let numParts = _.floor(this.room.energyCapacityAvailable / AssimilationCreepGovernor.calculateRequiredEnergy(this.bodyPart));
		if (numParts < 1) {
			numParts = 1;
		}
		if (this.maxParts > 1 && numParts > this.maxParts) {
			numParts = this.maxParts;
		}
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return AssimilationCreepGovernor.sortBodyParts(body);
	}

	public getCreepLimit(): number {
		let num: number;
		if (this.room.controller.level > 4) {
			num = _.floor(this.room.energyInContainers / 10000);
		} else if (this.room.controller.level < 3) {
			num = 1;
		} else {
			num = this.maxCreeps;
		}
		if (num > this.maxCreeps) {
			num = this.maxCreeps;
		}
		return (num > 0) ? num : 1;
	}
}
