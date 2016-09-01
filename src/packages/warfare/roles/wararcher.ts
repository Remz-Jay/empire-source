import * as RoomManager from "../../../components/rooms/roomManager";
import WarfareCreepAction from "../warfareCreepAction";

export interface IWarArcher {
	action(): boolean;
}

let roomCallback = function (roomName: string): CostMatrix {
	try {
		let room = RoomManager.getRoomByName(roomName);
		if (!room) {
			return;
		}
		let matrix = room.getCreepMatrix();
		return matrix;
	} catch (e) {
		console.log(JSON.stringify(e), "WarArcher.roomCallback", roomName);
		return new PathFinder.CostMatrix();
	}
};

export default class WarArcher extends WarfareCreepAction implements IWarArcher {
	public hasHealer: boolean = false;
	public hardPath: boolean = true;
	public noTarget: boolean = false;
	public sourceKeeperDuty: boolean = false;
	public boosts: string[] = [
		RESOURCE_CATALYZED_KEANIUM_ALKALIDE, // +300% rangedAttack and rangedMassAttack effectiveness
		RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, // +300% heal and rangedHeal effectiveness
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
	];

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
		return (tough > 50);
	}

	public moveToHeal(): boolean {
		if (this.creep.getActiveBodyparts(RANGED_ATTACK) < 3) {
			this.positionIterator = this.creep.memory.positionIterator = 0;
			this.moveUsingPositions();
		}
		if (!this.checkTough()) {
			let targets = this.creep.room.hostileCreeps.filter((c: Creep) => c.pos.inRangeTo(this.creep.pos, 3));
			if (targets.length > 0) {
				let goals = _.map(targets, function (t: Creep) {
					return {pos: t.pos, range: 4};
				});
				let path = PathFinder.search(this.creep.pos, goals, {
					flee: true,
					maxRooms: 1,
					plainCost: 2,
					swampCost: 3,
					roomCallback: roomCallback,
				});
				let pos = path.path[0];
				Memory.log.move.push(`${this.creep.name} - ${this.creep.memory.role} - moveToHeal #${++this.moveIterator}`);
				this.creep.move(this.creep.pos.getDirectionTo(pos));
				this.creep.memory.waitForHealth = true;
				delete this.creep.memory.targetPath;
				return false;
			}
		}
		return true;
	}

	public moveToSafeRange(): boolean {
		let targets = this.creep.room.hostileCreeps.filter(
			(c: Creep) => (c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0)
			&& c.pos.inRangeTo(this.creep.pos, 2)
		);
		if (targets.length > 0) {
			let goals = _.map(targets, function (t: Creep) {
				return {pos: t.pos, range: 3};
			});
			let path = PathFinder.search(this.creep.pos, goals, {
				flee: true,
				maxRooms: 1,
				plainCost: 2,
				swampCost: 3,
				roomCallback: roomCallback,
			});
			let pos = path.path[0];
			Memory.log.move.push(`${this.creep.name} - ${this.creep.memory.role} - moveToSafeRange #${++this.moveIterator}`);
			this.creep.move(this.creep.pos.getDirectionTo(pos));
			delete this.creep.memory.targetPath;
			return false;
		}
		return true;
	}

	public move() {
		if (!this.hasHealer && !this.moveToHeal() || !this.moveToSafeRange() || !!this.creep.memory.waitForHealth) {
			return;
		} else if (this.hasHealer && !this.checkTough()) {
			let closest = this.creep.pos.findClosestByRange(this.creep.room.myCreeps, {
				filter: (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(HEAL) > 5,
			});
			if (!!closest && !this.creep.pos.isNearTo(closest)) {
				// get in range
				this.creep.moveTo(closest);
				return;
			} else if (!!closest) {
				// stay in range
				this.creep.move(this.creep.pos.getDirectionTo(closest.pos));
				return;
			}
		}
		if (!this.moveUsingPositions()) {
			let target: Creep | Structure;
			if (!this.noTarget && !this.creep.memory.target) {
				target = this.findTarget() || this.findHealTarget() || this.findTargetStructure() || undefined;
				if (!!target) {
					this.creep.memory.target = target.id;
					delete this.creep.memory.targetPath;
				} else {
					delete this.creep.memory.target;
					delete this.creep.memory.targetPath;
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
				// this.moveTo(target.pos);
				Memory.log.move.push(`${this.creep.name} - ${this.creep.memory.role} - noHardPath #${++this.moveIterator}`);
				this.creep.move(this.creep.pos.getDirectionTo(target));
				return;
			}

			// Otherwise, use a pathFinder path to get there.
			if (!!target && !!this.creep.memory.target && target.id === this.creep.memory.target) {
				let range = (target instanceof Creep && target.my) ? 1 : 3;
				if (!this.creep.pos.inRangeTo(target.pos, range)) { // move closer if we're out of RANGED_ATTACK range.
					if (!!this.creep.memory.targetPath) {
						if (!this.creep.memory.pathTTL || this.creep.memory.pathTTL < 5) {
							let path = this.deserializePathFinderPath(this.creep.memory.targetPath);
							this.creep.memory.pathTTL = (!!this.creep.memory.pathTTL) ? ++this.creep.memory.pathTTL : 1;
							this.moveByPath(path, target);
						} else {
							delete this.creep.memory.targetPath;
							this.creep.memory.pathTTL = 1;
							if (!this.findNewPath(target, "targetPath", true, range)) {
								this.creep.say("HALP!");
							}
						}
					} else {
						this.creep.memory.pathTTL = 1;
						delete this.creep.memory.targetPath;
						if (!this.findNewPath(target, "targetPath", true, range)) {
							this.creep.say("HALP!");
						}
					}
				} else {
					// Just sit there.
					delete this.creep.memory.targetPath;
				}
			} else {
				if (this.creep.room.allConstructionSites.length > 0) {
					this.creep.moveTo(this.creep.room.allConstructionSites[0].pos);
				} else {
					// stay at the latest checkpoint
					this.creep.memory.positionIterator = this.positionIterator = (this.positions.length - 1);
				}
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
		return (lookResults.length === this.squadSize);
	}
	public action(): boolean {
		// if (!!this.creep.memory.inCombat || super.renewCreep()) {
		let blob = true;
		if (blob) {
			if ((this.wait && !this.creep.memory.squadComplete) || !this.creep.memory.squadComplete) {
				this.waitAtFlag(this.creep.memory.homeRoom);
				this.creep.memory.squadComplete = this.isSquadComplete();
			} else {
				if (this.creep.room.name === this.creep.memory.homeRoom) {
					if (this.getBoosted()) {
						this.move();
					}
				} else if (!this.positions && this.creep.room.name !== this.creep.memory.config.targetRoom) {
					this.moveToTargetRoom();
				} else {
					// this.nextStepIntoRoom();
					// See: http://support.screeps.com/hc/en-us/articles/203137792-Simultaneous-execution-of-creep-actions
					if (this.heal()) {
						delete this.creep.memory.waitForHealth;
						if (!this.rangedAttack(true) || !this.rangedHeal() || !this.rangedStructureAttack(false) || !this.rangedPublicStructureAttack()) {
							this.creep.memory.inCombat = true;
						} else {
							delete this.creep.memory.inCombat;
						}
					} else {
						if (!this.rangedAttack(true) || !this.rangedStructureAttack(false) || !this.rangedPublicStructureAttack()) {
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
