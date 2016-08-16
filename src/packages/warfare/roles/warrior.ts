import WarfareCreepAction from "../warfareCreepAction";

export interface IWarrior {
	action(): boolean;
}

export default class Warrior extends WarfareCreepAction implements IWarrior {

	public setCreep(creep: Creep) {
		super.setCreep(creep);
	}
	public hacknslash() {
		let closestHostile: Creep | Structure = this.creep.pos.findClosestByRange<Creep>(FIND_HOSTILE_CREEPS);
		if (!!closestHostile) {
			if (this.creep.attack(closestHostile) === ERR_NOT_IN_RANGE) {
				this.moveTo(closestHostile.pos);
			}
		} else {
			closestHostile = this.creep.pos.findClosestByPath<Structure>(FIND_HOSTILE_STRUCTURES, {
				filter: (s: Structure) => s.structureType === STRUCTURE_EXTENSION
				|| s.structureType === STRUCTURE_SPAWN
				|| s.structureType === STRUCTURE_TOWER,
			});
			if (!!closestHostile) {
				if (this.creep.attack(closestHostile) === ERR_NOT_IN_RANGE) {
					this.moveTo(closestHostile.pos);
				}
			} else {
				this.waitAtFlag(this.creep.memory.config.targetRoom);
			}
		}
	}

	public action(): boolean {
		if (super.renewCreep()) {
			if (this.wait) {
				this.waitAtFlag(this.creep.memory.homeRoom);
			} else {
				this.creep.say(this.creep.memory.config.targetRoom);
				if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
					this.moveToTargetRoom();
				} else {
					this.hacknslash();
				}
			}
		}
		return true;
	}
}