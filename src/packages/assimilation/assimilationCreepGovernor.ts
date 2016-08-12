import CreepGovernor from "../../components/creeps/creepGovernor";
export default class AssimilationCreepGovernor extends CreepGovernor {
	public config: RemoteRoomConfig;
	public spawn: Spawn;
	constructor(homeRoom: Room, homeSpawn: Spawn, config: RemoteRoomConfig) {
		super(homeRoom);
		this.config = config;
		this.spawn = homeSpawn;
	}
}
