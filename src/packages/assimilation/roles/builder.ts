import ASMCreepAction from "../assimilationCreepAction";

export interface IASMBuilder {
	action(): boolean;
}

export default class ASMBuilder extends ASMCreepAction implements IASMBuilder {

	public setCreep(creep: Creep) {
		super.setCreep(creep);
	}

	public action(): boolean {
		this.creep.say(this.creep.memory.config.targetRoom);
		if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
			this.moveToTargetRoom();
		} else {
			// yeah.
		}
		return true;
	}
}
