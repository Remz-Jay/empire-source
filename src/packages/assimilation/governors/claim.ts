import AssimilationCreepGovernor from "../assimilationCreepGovernor";

export default class ClaimGovernor extends AssimilationCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_ASM_CLAIM;
	public static MINRCL: number = global.MINRCL_ASM_CLAIM;
	public static ROLE: string = "Claim";

	public claim: boolean = false;
	public reserveOnly: boolean = false;
	public maxParts = 5;
	public maxCreeps = 1;
	public bodyPart = [CLAIM, MOVE];

	constructor(homeRoom: Room, config: RemoteRoomConfig, claim: boolean = false, reserveOnly = false) {
		super(homeRoom, config);
		this.claim = claim;
		this.reserveOnly = reserveOnly;
	}

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = `${this.room.name}-${ClaimGovernor.ROLE}-${global.time}`;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: ClaimGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getBody() {
		if (this.claim) {
			return  AssimilationCreepGovernor.sortBodyParts([TOUGH, TOUGH,
				MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
				MOVE, MOVE, CLAIM,
			]);
		} else {
			if (this.reserveOnly) {
				this.maxParts = 2;
			}
			return super.getBody();
		}
	}
}
