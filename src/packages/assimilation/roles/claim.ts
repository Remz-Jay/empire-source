import ASMCreepAction from "../assimilationCreepAction";

export interface IClaim {
	doClaim: boolean;
	action(): boolean;
}

export default class Claim extends ASMCreepAction implements IClaim {
	public doClaim: boolean;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.doClaim = false;
	}

	public assimilateRoom() {
		this.nextStepIntoRoom();
		if (!this.creep.pos.isNearTo(this.creep.room.controller)) {
			this.moveTo(this.creep.room.controller.pos);
		} else {
			// once we're at the controller, claim it.
			if (this.doClaim) {
				this.creep.claimController(this.creep.room.controller);
			} else {
				this.creep.reserveController(this.creep.room.controller);
			}
		}
	}

	public action(): boolean {
		this.creep.say(this.creep.memory.config.targetRoom);
		if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
			this.moveToTargetRoom();
		} else {
			this.assimilateRoom();
		}
		return true;
	}
}
