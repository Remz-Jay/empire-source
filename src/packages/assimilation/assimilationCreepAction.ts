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
			const repairTarget = _(this.creep.pos.lookFor(LOOK_STRUCTURES)).filter((s: Structure) => s.hits < s.hitsMax).first() as Structure;
			if (!!repairTarget) {
				this.creep.repair(repairTarget);
			} else {
				const buildTarget = _(this.creep.pos.lookFor(LOOK_CONSTRUCTION_SITES)).first() as ConstructionSite;
				if (!!buildTarget) {
					this.creep.build(buildTarget);
				}
			}
		}
	}

	public action(startCpu: number): boolean {
		if (!this.renewCreep() || !this.flee() || this.shouldIGoHome()) {
			return false;
		}

		this.pickupResourcesInRange();
		return true;
	}
}
