import WarfareCreepAction from "../warfareCreepAction";

export interface IWarClaimer {
	action(startCpu: number): boolean;
}

export default class WarClaimer extends WarfareCreepAction implements IWarClaimer {
	public targetController: StructureController;
	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
		this.targetController = _.get(Game.rooms[this.creep.memory.config.targetRoom], "controller", undefined);
	}

	public action(startCpu: number): boolean {
		this.startCpu = startCpu;
		if (!this.moveUsingPositions()) {
			if (!this.creep.pos.isNearTo(this.targetController)) {
				this.moveTo(this.targetController.pos);
			} else {
				// once we're at the controller, claim it.
				this.creep.claimController(this.targetController);
			}
		}
		return true;
	}
}
