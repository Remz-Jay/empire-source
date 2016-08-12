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

	constructor(homeRoom: Room, homeSpawn: Spawn, config: RemoteRoomConfig, containers: StructureContainer[]) {
		super(homeRoom, homeSpawn, config);
		this.containers = containers;
	}

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			homeSpawn: this.spawn.name,
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
		return _.find(harvesters, function (h: Creep) {
			return (!!h.memory.container) && c.id === h.memory.container;
		});
	}

	public getCreepLimit(): number {
		return this.containers.length;
	}
}
