import WarfareCreepAction from "../warfareCreepAction";

export interface IHealer {
	action(): boolean;
}

export default class Healer extends WarfareCreepAction implements IHealer {

	public setCreep(creep: Creep) {
		super.setCreep(creep);
	}

	public heal(): boolean {
		// TODO: Prioritize Squad Members by hits.
		let targets = this.creep.pos.findInRange<Creep>(FIND_MY_CREEPS, 10, {
			filter: (c: Creep) => c.hits < c.hitsMax,
		});
		if (!!targets && targets.length > 0) {
			let target: Creep = undefined;
			_.reduce(targets, function(result, value) {
				if ((value.hitsMax - value.hits) > result) {
					result = (value.hitsMax - value.hits);
					target = value;
				}
				return result;
			}, 0);
			this.creep.moveTo(target);
			if (this.creep.pos.isNearTo(target)) {
				this.creep.heal(target);
			} else {
				this.creep.rangedHeal(target);
			}
			return false;
		} else {
			return true;
		}
	}

	public action(): boolean {
		if (super.renewCreep()) {
			if (this.wait) {
				this.waitAtFlag(this.creep.memory.homeRoom);
			} else {
				if (this.heal()) {
					this.creep.say(this.creep.memory.config.targetRoom);
					if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
						this.moveToTargetRoom();
					} else {
						this.nextStepIntoRoom();
						this.followWarrior();
					}
				}
			}
		}
		return true;
	}
}
