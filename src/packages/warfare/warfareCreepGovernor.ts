import CreepGovernor from "../../components/creeps/creepGovernor";
export default class WarfareCreepGovernor extends CreepGovernor {
	public config: RemoteRoomConfig;
	public maxParts: number = 25;
	public maxTough: number = 25;
	public maxCreeps: number = 0;
	public bodyPart: string[] = [];
	public toughPart: string[] = [];
	public basePart: string[] = [];

	constructor(homeRoom: Room, config: RemoteRoomConfig) {
		super(homeRoom);
		this.config = config;
	}

	public getToughBody(): string[] {
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
}
