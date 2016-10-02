import AssimilationCreepGovernor from "../assimilationCreepGovernor";

export default class ASMHarvesterGovernor extends AssimilationCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_ASM_HARVESTER;
	public static MINRCL: number = global.MINRCL_ASM_HARVESTER;
	public static ROLE: string = "ASMHarvester";

	public basePart: string[] = [CARRY, CARRY, MOVE];
	public bodyPart: string[] = [WORK, WORK, MOVE];
	public maxParts: number = 3;
	public maxCreeps: number = 1;
	public containers: StructureContainer[] = [];

	constructor(homeRoom: Room, config: RemoteRoomConfig, containers: StructureContainer[]) {
		super(homeRoom, config);
		this.containers = containers;
	}

	public getBody() {
		const hasController = _.get(this.config, "hasController", true);
		const hasClaim = _.get(this.config, "claim", false);
		if (!hasController || hasClaim) {
			this.bodyPart = [WORK, WORK, MOVE, MOVE];
			let body: string[] = [CARRY, MOVE];
			for (let i = 0; i < 4; i++) {
				body = body.concat(this.bodyPart);
			}
			return AssimilationCreepGovernor.sortBodyParts(body);
		}
		const numParts: number = global.clamp(_.floor(
				(this.room.energyCapacityAvailable - AssimilationCreepGovernor.calculateRequiredEnergy(this.basePart)) /
				AssimilationCreepGovernor.calculateRequiredEnergy(this.bodyPart)), 1, this.maxParts);
		let body: string[] = this.basePart;
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return AssimilationCreepGovernor.sortBodyParts(body);
	}

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${ASMHarvesterGovernor.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: ASMHarvesterGovernor.ROLE,
			config: this.config,
			container: this.checkContainerAssignment(),
		};
		return {body: bodyParts, name: name, properties: properties};
	}
	public checkContainerAssignment(): string {
		let freeContainer: string = undefined;
		_.each(this.containers, function(c: StructureContainer) {
			const h = this.checkAssignedHarvester(c);
			if (!h) {
				freeContainer = c.id;
			}
		}, this);
		return freeContainer;
	}

	public checkAssignedHarvester(c: StructureContainer): Creep {
		const harvesters = global.tickCache.roles[ASMHarvesterGovernor.ROLE];
		return harvesters.find((h: Creep) => (!!h.memory.container) && c.id === h.memory.container);
	}

	public getCreepLimit(): number {
		if (this.config.targetRoom === "W6N49") {
			return 0;
		}
		return this.containers.length;
	}
}
