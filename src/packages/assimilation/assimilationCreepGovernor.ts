import CreepGovernor from "../../components/creeps/creepGovernor";
export default class AssimilationCreepGovernor extends CreepGovernor {
	public config: RemoteRoomConfig;
	constructor(homeRoom: Room, config: RemoteRoomConfig) {
		super(homeRoom);
		this.config = config;
	}
	public getCreepsInRole(): Creep[] {
		return _.filter(global.tickCache.roles[Object.getPrototypeOf(this).constructor.ROLE],
			(creep: Creep) => creep.memory.config.homeRoom === this.room.name && creep.memory.config.targetRoom === this.config.targetRoom);
	}
}
