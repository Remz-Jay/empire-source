import CreepAction from "../../components/creeps/creepAction";

export interface IASMCreepAction {
}

export default class ASMCreepAction extends CreepAction implements IASMCreepAction {

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
	public passingRepair(): void {
		if (this.creep.carry.energy > 0) {
			let lookTargets = this.creep.pos.lookFor(LOOK_STRUCTURES).filter((s: Structure) => s.hits < s.hitsMax) as Structure[];
			if (lookTargets.length > 0) {
				this.creep.repair(lookTargets.shift());
			}
		}
	}

	public action(): boolean {
		if (!this.renewCreep() || !this.flee() || this.shouldIGoHome()) {
			return false;
		}

		this.pickupResourcesInRange();
		return true;
	}
}
