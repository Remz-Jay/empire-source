import * as RoomManager from "../../../components/rooms/roomManager";
import WarfareCreepAction from "../warfareCreepAction";

export interface ITerminator {
	action(): boolean;
}

let roomCallback = function (roomName: string): CostMatrix {
	try {
		let room = RoomManager.getRoomByName(roomName);
		if (!room) {
			return;
		}
		let matrix = room.getCreepMatrix();
		// avoid the edges
		for (let i = 1; i < 50; i++) {
			matrix.set(0, i, 50);
		}
		for (let i = 1; i < 50; i++) {
			matrix.set(49, i, 50);
		}
		for (let i = 1; i < 50; i++) {
			matrix.set(i, 0, 50);
		}
		for (let i = 1; i < 50; i++) {
			matrix.set(i, 49, 50);
		}
		return matrix;
	} catch (e) {
		console.log(JSON.stringify(e), "Terminator.roomCallback", roomName);
		return new PathFinder.CostMatrix();
	}
};

export default class Terminator extends WarfareCreepAction implements ITerminator {

	public hardPath: boolean = true;
	public noTarget: boolean = false;

	public setCreep(creep: Creep, positions?: RoomPosition[]) {
		super.setCreep(creep, positions);
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
		if (this.creep.getActiveBodyparts(RANGED_ATTACK) < 2) {
			this.positionIterator = this.creep.memory.positionIterator = 0;
			this.moveUsingPositions();
		}
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
					swampCost: 15,
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
		let targets = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 2, {
			filter: (c: Creep) => c.getActiveBodyparts(ATTACK) > 0
			|| c.getActiveBodyparts(RANGED_ATTACK) > 0,
		});
		if (targets.length > 0) {
			let goals = _.map(targets, function (t: Creep) {
				return {pos: t.pos, range: 3};
			});
			let path = PathFinder.search(this.creep.pos, goals, {
				flee: true,
				maxRooms: 1,
				plainCost: 2,
				swampCost: 15,
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
		if (!this.moveUsingPositions()) {
			let target: Creep | Structure = undefined;
			if (!this.noTarget && !this.creep.memory.target) {
				target = this.findTarget();
				if (!!target) {
					this.creep.memory.target = target.id;
					delete this.creep.memory.targetPath;
				} else {
					target = this.findHealTarget();
					if (!!target) {
						this.creep.memory.target = target.id;
						delete this.creep.memory.targetPath;
					} else {
						target = this.findTargetStructure();
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
			} else if (!this.noTarget) {
				target = Game.getObjectById<Creep>(this.creep.memory.target);
				if (!target || (!!target.my && target.hits === target.hitsMax)) { // target died or full health?
					target = this.findTarget();
					if (!!target) {
						this.creep.memory.target = target.id;
						delete this.creep.memory.targetPath;
					} else {
						delete this.creep.memory.target;
						delete this.creep.memory.targetPath;
						this.waitAtFlag(this.creep.memory.config.targetRoom);
					}
				} else if (target instanceof Structure) {
					// check if we have better things to do
					let t2 = this.findTarget();
					if (!!t2) {
						target = t2;
						this.creep.memory.target = target.id;
						delete this.creep.memory.targetPath;
					}
				}
			}
			// Just moveTo when we're safely behind walls
			if (!!target && !this.hardPath) {
				this.moveTo(target.pos);
				this.creep.move(this.creep.pos.getDirectionTo(target));
				return;
			}

			// Otherwise, use a pathFinder path to get there.
			if (!!target && !!this.creep.memory.target && target.id === this.creep.memory.target) {
				if (this.creep.pos.getRangeTo(target) > 3) { // move closer if we're out of RANGED_ATTACK range.
					if (!!this.creep.memory.targetPath) {
						if (!this.creep.memory.pathTTL || this.creep.memory.pathTTL < 5) {
							let path = this.deserializePathFinderPath(this.creep.memory.targetPath);
							this.creep.memory.pathTTL = (!!this.creep.memory.pathTTL) ? this.creep.memory.pathTTL + 1 : 1;
							this.moveByPath(path, target);
						} else {
							delete this.creep.memory.targetPath;
							this.creep.memory.pathTTL = 1;
							if (!this.findNewPath(target)) {
								this.creep.say("HALP!");
							}
						}
					} else {
						this.creep.memory.target = target.id;
						this.creep.memory.pathTTL = 1;
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
				this.waitAtFlag(this.creep.memory.config.targetRoom);
			}
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
		// if (!!this.creep.memory.inCombat || super.renewCreep()) {
		let blob = true;
		if (blob) {
			if ((this.wait && !this.creep.memory.squadComplete) || !this.creep.memory.squadComplete) {
				this.waitAtFlag(this.creep.memory.homeRoom);
				this.creep.memory.squadComplete = this.isSquadComplete();
			} else {
				if (!this.positions && this.creep.room.name !== this.creep.memory.config.targetRoom) {
					this.moveToTargetRoom();
				} else {
					this.nextStepIntoRoom();
					// See: http://support.screeps.com/hc/en-us/articles/203137792-Simultaneous-execution-of-creep-actions
					if (this.heal()) {
						delete this.creep.memory.waitForHealth;
						if (!this.rangedAttack() || !this.rangedHeal() || !this.rangedStructureAttack() || !this.rangedPublicStructureAttack()) {
							this.creep.memory.inCombat = true;
						} else {
							delete this.creep.memory.inCombat;
						}
					} else {
						if (!this.rangedAttack() || !this.rangedStructureAttack() || !this.rangedPublicStructureAttack()) {
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
