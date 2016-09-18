import ASMCreepAction from "../assimilationCreepAction";

export interface IClaim {
	doClaim: boolean;
	action(): boolean;
}

export default class Claim extends ASMCreepAction implements IClaim {
	public doClaim: boolean;
	public targetController: StructureController;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.doClaim = false;
		this.targetController = Game.rooms[this.creep.memory.config.targetRoom].controller;
	}

	public assimilateRoom() {
		// this.nextStepIntoRoom();
		if (!this.creep.pos.isNearTo(this.targetController)) {
			this.moveTo(this.targetController.pos);
		} else {
			// once we're at the controller, claim it.
			if (this.doClaim) {
				this.creep.claimController(this.targetController);
			} else {
				this.creep.reserveController(this.targetController);
			}
		}
	}

	public action(): boolean {
		this.creep.say(this.creep.memory.config.targetRoom);
		if (this.flee()) {
			this.assimilateRoom();
		}
		return true;
	}
}
