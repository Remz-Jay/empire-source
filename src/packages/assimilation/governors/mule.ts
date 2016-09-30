import AssimilationCreepGovernor from "../assimilationCreepGovernor";

export default class ASMMuleGovernor extends AssimilationCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_ASM_MULE;
	public static MINRCL: number = global.MINRCL_ASM_MULE;
	public static ROLE: string = "ASMMule";

	public bodyPart: string[] = [CARRY, MOVE];
	public basePart: string[] = [WORK, MOVE];
	public maxParts: number = 20;
	public maxCreeps: number = 1;
	public multiplier: number = 1;
	public containers: StructureContainer[] = [];

	constructor(homeRoom: Room, config: RemoteRoomConfig, containers: StructureContainer[]) {
		super(homeRoom, config);
		this.multiplier = (config.hasController) ? 1 : 2; // SK Rooms get 2 mules / source.
		this.containers = containers;
	}
	public getBody() {
		let numParts = global.clamp(_.floor(
			(this.room.energyCapacityAvailable - AssimilationCreepGovernor.calculateRequiredEnergy(this.basePart)) /
			AssimilationCreepGovernor.calculateRequiredEnergy(this.bodyPart)), 0, this.maxParts);
		let body: string[] = this.basePart;
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return AssimilationCreepGovernor.sortBodyParts(body);
	}

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = `${this.room.name}-${ASMMuleGovernor.ROLE}-${global.time}`;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: ASMMuleGovernor.ROLE,
			config: this.config,
			container: this.checkContainerAssignment(),
		};
		return {body: bodyParts, name: name, properties: properties};
	}
	public checkContainerAssignment(): string {
		let freeContainer: string = undefined;
		_.each(this.containers, function(c: StructureContainer) {
			let mules = this.checkAssignedMules(c);
			if (!mules || mules.length < this.multiplier) {
				freeContainer = c.id;
			}
		}, this);
		return freeContainer;
	}

	public checkAssignedMules(c: StructureContainer): Creep[] {
		return _.filter(Game.creeps, creep =>
			(creep.memory.role.toUpperCase() === ASMMuleGovernor.ROLE.toUpperCase())
			&& (!!creep.memory.container && c.id === creep.memory.container)
		);
	}
	public getCreepLimit(): number {
		return this.containers.length * this.multiplier;
	}
}
