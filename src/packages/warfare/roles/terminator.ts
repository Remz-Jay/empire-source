import WarfareCreepAction from "../warfareCreepAction";

export interface ITerminator {
	action(): boolean;
}

export default class Terminator extends WarfareCreepAction implements ITerminator {

	public response: string = "";

	public setCreep(creep: Creep) {
		super.setCreep(creep);
	}

	public getPriorityCreep(creeps: Creep[]): Creep {
		let target: Creep = undefined;
		_.reduce(creeps, function(result, value) {
			if ((value.hitsMax - value.hits) > result) {
				result = (value.hitsMax - value.hits);
				target = value;
			}
			return result;
		}, 0);
		return target;
	}

	public heal(): boolean {
		if (this.creep.hits < this.creep.hitsMax) {
			this.creep.heal(this.creep);
			this.response = this.response.concat("H");
			return false;
		} else {
			let targets = this.creep.pos.findInRange<Creep>(FIND_MY_CREEPS, 1, {
				filter: (c: Creep) => c.hits < c.hitsMax,
			});
			if (targets.length > 0) {
				let target = this.getPriorityCreep(targets);
				this.creep.heal(target);
				this.response = this.response.concat("H");
				return false;
			}
		}
		return true;
	}
	public attack(): boolean {
		let targets = this.creep.pos.findInRange<Creep>(FIND_HOSTILE_CREEPS, 1, {
			filter: (c: Creep) => c.hits < c.hitsMax,
		});
		if (targets.length > 0) {
			let target = this.getPriorityCreep(targets);
			this.creep.attack(target);
			this.response = this.response.concat("A");
			return false;
		}
		return true;
	}
	public rangedAttack(): boolean {
		let targets: Creep[] = this.creep.pos.findInRange<Creep>(FIND_HOSTILE_CREEPS, 3);
		if (targets.length > 0) {
			if (targets.length > 1) {
				this.creep.rangedMassAttack();
				this.response = this.response.concat("M");
				return false;
			} else {
				let target = this.getPriorityCreep(targets);
				this.creep.rangedAttack(target);
				this.response = this.response.concat("R");
				return false;
			}
		}
		return true;
	}
	public rangedHeal(): boolean {
		let targets = this.creep.pos.findInRange<Creep>(FIND_MY_CREEPS, 3, {
			filter: (c: Creep) => c.hits < c.hitsMax,
		});
		if (targets.length > 0) {
			let target = this.getPriorityCreep(targets);
			this.creep.rangedHeal(target);
			this.response = this.response.concat("Z");
			return false;
		}
		return true;
	}
	public findTarget(): Creep {
		let hostile = this.creep.pos.findClosestByPath<Creep>(FIND_HOSTILE_CREEPS, {maxRooms: 1});
		if (!!hostile) {
			return hostile;
		}
		return undefined;
	}

	public move() {
		let target: Creep = undefined;
		if (!this.creep.memory.target) {
			target = this.findTarget();
			if (!!target) {
				this.creep.memory.target = target.id;
				delete this.creep.memory.targetPath;
			} else {
				delete this.creep.memory.target;
				delete this.creep.memory.targetPath;
				this.waitAtFlag(this.creep.memory.config.targetRoom);
				this.response = this.response.concat("F");
			}
		} else {
			target = Game.getObjectById<Creep>(this.creep.memory.target);
			if (!target) { // target died?
				target = this.findTarget();
				if (!!target) {
					this.creep.memory.target = target.id;
					delete this.creep.memory.targetPath;
				} else {
					delete this.creep.memory.target;
					delete this.creep.memory.targetPath;
					this.waitAtFlag(this.creep.memory.config.targetRoom);
					this.response = this.response.concat("F");
				}
			}
		}
		if (!!target && !!this.creep.memory.target && !this.creep.pos.isNearTo(target)) {
			if (!!this.creep.memory.target && this.creep.memory.target === target.id && !!this.creep.memory.targetPath) {
				let path = this.deserializePathFinderPath(this.creep.memory.targetPath);
				this.moveByPath(path, target);
				this.response = this.response.concat("P");
			} else {
				this.creep.memory.target = target.id;
				delete this.creep.memory.targetPath;
				this.response = this.response.concat("N");
				if (!this.findNewPath(target)) {
					this.creep.say("HALP!");
				}
			}
		} else {
			delete this.creep.memory.targetPath;
		}
	}
	public isSquadComplete(): boolean {
		if (this.squad.length < this.squadSize) {
			return false;
		}
		let flag = Game.flags[this.creep.memory.homeRoom];
		let lookResults: LookAtResultWithPos[] = flag.room.lookForAtArea(
			LOOK_CREEPS,
			flag.pos.y - 1,
			flag.pos.x - 1,
			flag.pos.y + 1,
			flag.pos.x + 1,
			true // returns a LookAtResultWithPos[]
		) as LookAtResultWithPos[];
		return (lookResults.length === this.squadSize) ? true : false;
	}
	public action(): boolean {
		if (super.renewCreep()) {
			if ((this.wait && !this.creep.memory.squadComplete) || !this.creep.memory.squadComplete) {
				this.response = this.response.concat("W");
				this.waitAtFlag(this.creep.memory.homeRoom);
				this.creep.memory.squadComplete = this.isSquadComplete();
			} else {
				if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
					this.response = this.response.concat("RR");
					this.moveToTargetRoom();
				} else {
					// See: http://support.screeps.com/hc/en-us/articles/203137792-Simultaneous-execution-of-creep-actions
					if (this.heal()) {
						if (this.rangedHeal()) {
							this.attack();
							this.rangedAttack();
						}
					} else {
						this.rangedAttack();
					}
					this.move();
				}
			}
			this.creep.say(this.response);
		}
		return true;
	}
}
