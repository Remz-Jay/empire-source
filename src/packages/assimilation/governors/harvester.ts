import * as Config from "../../../config/config";
import AssimilationCreepGovernor from "../assimilationCreepGovernor";

export default class ASMHarvesterGovernor extends AssimilationCreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_ASM_HARVESTER;
	public static MINRCL: number = Config.MINRCL_ASM_HARVESTER;
	public static ROLE: string = "ASMHarvester";

	public bodyPart: string[] = [WORK, WORK, CARRY, MOVE];
	public maxParts: number = 4;
	public maxCreeps: number = 1;
	public containers: StructureContainer[] = [];

	constructor(homeRoom: Room, config: RemoteRoomConfig, containers: StructureContainer[]) {
		super(homeRoom, config);
		this.containers = containers;
	}

	public getBody() {
		let hasController = _.get(this.config, "hasController", true);
		if (!hasController) {
			this.bodyPart = [WORK, WORK, MOVE, MOVE];
			let body: string[] = [CARRY, MOVE];
			for (let i = 0; i < 4; i++) {
				body = body.concat(this.bodyPart);
			}
			return AssimilationCreepGovernor.sortBodyParts(body);
		}
		let numParts = _.floor(this.room.energyCapacityAvailable / AssimilationCreepGovernor.calculateRequiredEnergy(this.bodyPart));
		if (numParts < 1) {
			numParts = 1;
		}
		if (numParts > this.maxParts) {
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

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
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
			let h = this.checkAssignedHarvester(c);
			if (!h) {
				freeContainer = c.id;
			}
		}, this);
		return freeContainer;
	}

	public checkAssignedHarvester(c: StructureContainer): Creep {
		let harvesters = _.filter(Game.creeps, creep => creep.memory.role.toUpperCase() === ASMHarvesterGovernor.ROLE.toUpperCase());
		return harvesters.find((h: Creep) => (!!h.memory.container) && c.id === h.memory.container);
	}

	public getCreepLimit(): number {
		return this.containers.length;
	}
}
