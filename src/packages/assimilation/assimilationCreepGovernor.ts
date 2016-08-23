import CreepGovernor from "../../components/creeps/creepGovernor";
export default class AssimilationCreepGovernor extends CreepGovernor {
	public config: RemoteRoomConfig;
	constructor(homeRoom: Room, config: RemoteRoomConfig) {
		super(homeRoom);
		this.config = config;
	}
}
