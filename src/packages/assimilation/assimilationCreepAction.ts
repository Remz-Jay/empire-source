import CreepAction from "../../components/creeps/creepAction";

export interface IASMCreepAction {
}

export default class ASMCreepAction extends CreepAction implements IASMCreepAction {
	public static config: RemoteRoomConfig;

	public static setConfig(config: RemoteRoomConfig) {
		this.config = config;
	}

	public static getCreepsInRole(room: Room): Creep[] {
		return _.filter(global.tickCache.roles[this.ROLE],
			(creep: Creep) => creep.memory.config.homeRoom === room.name && creep.memory.config.targetRoom === this.config.targetRoom);
	}

	public goHome: boolean;

	public setGoHome(gh: boolean): void {
		this.goHome = gh;
	}

	public shouldIGoHome(): boolean {
		if (this.goHome) {
			this.moveTo(Game.rooms[this.creep.memory.homeRoom].minerals[0].pos);
			return true;
		} else {
			return false;
		}
	}

	public action(): boolean {
		if (!this.renewCreep() || !this.flee() || this.shouldIGoHome()) {
			return false;
		}

		this.creep.pickupResourcesInRange();
		return true;
	}
}
