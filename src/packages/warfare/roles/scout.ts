import WarfareCreepAction from "../warfareCreepAction";

export interface IScout {
	action(): boolean;
}

let roomCallback = function (roomName: string): CostMatrix {
	try {
		let room = Game.rooms[roomName];
		if (!room) {
			return;
		}
		return room.getCreepMatrix();
	} catch (e) {
		console.log(JSON.stringify(e), "Scout.roomCallback", roomName);
		return new PathFinder.CostMatrix();
	}
};

export default class Scout extends WarfareCreepAction implements IScout {

	public setCreep(creep: Creep) {
		super.setCreep(creep);
	}

	public checkTough(): boolean {
		let tough: number = 0;
		_.each(this.creep.body, function (part: BodyPartDefinition) {
			if (part.type === TOUGH) {
				tough += part.hits;
			}
		});
		return (tough > 50) ? true : false;
	}

	public moveToHeal(): boolean {
		if (!this.checkTough()) {
			let targets = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
			if (targets.length > 0) {
				let goals = _.map(targets, function (t: Creep) {
					return {pos: t.pos, range: 4};
				});
				let path = PathFinder.search(this.creep.pos, goals, {
					flee: true,
					maxRooms: 1,
					plainCost: 2,
					swampCost: 6,
					roomCallback: roomCallback,
				});
				let pos = path.path[0];
				this.creep.move(this.creep.pos.getDirectionTo(pos));
				this.creep.memory.waitForHealth = true;
				delete this.creep.memory.targetPath;
				return false;
			}
		}
		return true;
	}

	public moveToSafeRange(): boolean {
		let targets = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 2);
		if (targets.length > 0) {
			let goals = _.map(targets, function (t: Creep) {
				return {pos: t.pos, range: 3};
			});
			let path = PathFinder.search(this.creep.pos, goals, {
				flee: true,
				maxRooms: 1,
				plainCost: 2,
				swampCost: 6,
				roomCallback: roomCallback,
			});
			let pos = path.path[0];
			this.creep.move(this.creep.pos.getDirectionTo(pos));
			delete this.creep.memory.targetPath;
			return false;
		}
		return true;
	}

	public move() {
		if (!this.moveToHeal() || !this.moveToSafeRange() || !!this.creep.memory.waitForHealth) {
			return;
		}
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
				}
			}
		}
		if (!!target && !!this.creep.memory.target && target.id === this.creep.memory.target) {
			if (this.creep.pos.getRangeTo(target) > 3) { // move closer if we're out of RANGED_ATTACK range.
				if (!!this.creep.memory.targetPath) {
					let path = this.deserializePathFinderPath(this.creep.memory.targetPath);
					this.moveByPath(path, target);
				} else {
					this.creep.memory.target = target.id;
					delete this.creep.memory.targetPath;
					if (!this.findNewPath(target)) {
						this.creep.say("HALP!");
					}
				}
			} else {
				// Just sit there.
				delete this.creep.memory.targetPath;
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
		if (!!this.creep.memory.inCombat || super.renewCreep()) {
			if ((this.wait && !this.creep.memory.squadComplete) || !this.creep.memory.squadComplete) {
				this.waitAtFlag(this.creep.memory.homeRoom);
				this.creep.memory.squadComplete = this.isSquadComplete();
			} else {
				if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
					this.moveToTargetRoom();
				} else {
					// See: http://support.screeps.com/hc/en-us/articles/203137792-Simultaneous-execution-of-creep-actions
					if (this.heal()) {
						delete this.creep.memory.waitForHealth;
						if (this.rangedHeal()) {
							if (!this.rangedAttack()) {
								this.creep.memory.inCombat = true;
							} else {
								delete this.creep.memory.inCombat;
							}
						}
					} else {
						if (!this.rangedAttack()) {
							this.creep.memory.inCombat = true;
						} else {
							delete this.creep.memory.inCombat;
						}
					}
					this.move();
				}
			}
		} else {
			if (!!this.creep.memory.lastHealth && this.creep.memory.lastHealth > this.creep.hits) {
				// Our health changed negatively last tick. Defend before proceeding to renew.
				this.creep.memory.inCombat = true;
				this.creep.memory.lastHealth = this.creep.hits;
				this.heal();
				this.rangedAttack();
				this.move();
			} else {
				this.creep.memory.lastHealth = this.creep.hits;
			}
		}
		return true;
	}
}
