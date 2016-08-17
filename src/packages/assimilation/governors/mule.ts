import * as Config from "../../../config/config";
import AssimilationCreepGovernor from "../assimilationCreepGovernor";

export default class ASMMuleGovernor extends AssimilationCreepGovernor {

	public static PRIORITY: number = Config.PRIORITY_ASM_MULE;
	public static MINRCL: number = Config.MINRCL_ASM_MULE;
	public static ROLE: string = "ASMMule";

	public bodyPart: string[] = [CARRY, MOVE];
	public maxParts: number = 8;
	public maxCreeps: number = 1;
	public containers: StructureContainer[] = [];

	constructor(homeRoom: Room, homeSpawn: Spawn, config: RemoteRoomConfig, containers: StructureContainer[]) {
		super(homeRoom, homeSpawn, config);
		this.containers = containers;
	}

	public getBody(): string[] {
		let numParts: number;
		numParts = _.floor((this.room.energyCapacityAvailable - 200) / AssimilationCreepGovernor.calculateRequiredEnergy(this.bodyPart));

		if (numParts > this.maxParts) {
			numParts = this.maxParts;
		}
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 46) {
				body = body.concat(this.bodyPart);
			}
		}
		body = body.concat([WORK, WORK, MOVE, MOVE]);
		return AssimilationCreepGovernor.sortBodyParts(body);
	}

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: this.spawn.name,
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
			if (!mules || mules.length < 2) {
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
		return this.containers.length * 2;
	}
}
