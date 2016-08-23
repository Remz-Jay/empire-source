import CreepGovernor from "../../components/creeps/creepGovernor";
export default class WarfareCreepGovernor extends CreepGovernor {
	public config: RemoteRoomConfig;
	constructor(homeRoom: Room, config: RemoteRoomConfig) {
		super(homeRoom);
		this.config = config;
	}
}
