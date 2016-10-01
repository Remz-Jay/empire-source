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
		const numParts = global.clamp(_.floor(
			(this.room.energyCapacityAvailable - WarfareCreepGovernor.calculateRequiredEnergy(this.basePart)) /
			WarfareCreepGovernor.calculateRequiredEnergy(this.bodyPart)), 1, this.maxParts);

		let body: string[] = this.basePart;
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		const remainingEnergy = this.room.energyCapacityAvailable - WarfareCreepGovernor.calculateRequiredEnergy(body);
		const numTough = global.clamp(_.floor(remainingEnergy / WarfareCreepGovernor.calculateRequiredEnergy(this.toughPart)), 0, this.maxTough);
		for (let i = 0; i < numTough; i++) {
			if (body.length + this.toughPart.length <= 50) {
				body = body.concat(this.toughPart);
			}
		}
		return WarfareCreepGovernor.sortBodyParts(body);
	}
}
