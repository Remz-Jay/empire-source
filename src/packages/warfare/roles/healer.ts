import * as RoomManager from "../../../components/rooms/roomManager";
import WarfareCreepAction from "../warfareCreepAction";

export interface IHealer {
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

export default class Healer extends WarfareCreepAction implements IHealer {

	public hardPath: boolean = false;

	public setCreep(creep: Creep, positions: RoomPosition[]) {
		let posarr = positions.slice(); // Need a copy, or pop() and splice() will modify the original.
		posarr.splice(-1, 1); // Remove the last position, because it's in hostile territory.
		super.setCreep(creep, posarr);
	}

	public moveToHeal(): boolean {
		if (this.creep.hits < this.creep.hitsMax) {
			this.creep.memory.waitForHealth = true;
			this.creep.memory.positionIterator = this.positionIterator = (this.positions.length - 1);
			if (!this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
				this.moveTo(this.positions[this.positionIterator]);
			}
			return false;
		}
		return true;
	}

	public moveToSafeRange(): boolean {
		let targets = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 4, {
			filter: (c: Creep) => c.getActiveBodyparts(ATTACK) > 0
			|| c.getActiveBodyparts(RANGED_ATTACK) > 0,
		});
		if (targets.length > 0) {
			let goals = _.map(targets, function (t: Creep) {
				return {pos: t.pos, range: 5};
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
		if (!this.moveUsingPositions()) {
			let target: Creep | Structure = undefined;
			if (!this.creep.memory.target) {
				target = this.findHealTarget();
				if (!!target) {
					this.creep.memory.target = target.id;
					delete this.creep.memory.targetPath;
				} else {
					delete this.creep.memory.target;
					delete this.creep.memory.targetPath;
					this.creep.memory.positionIterator--;
				}
			} else {
				target = Game.getObjectById<Creep>(this.creep.memory.target);
				if (!target || (!!target.my && target.hits === target.hitsMax)) { // target died or full health?
					target = this.findHealTarget();
					if (!!target) {
						this.creep.memory.target = target.id;
						delete this.creep.memory.targetPath;
					} else {
						delete this.creep.memory.target;
						delete this.creep.memory.targetPath;
						this.creep.memory.positionIterator--;
					}
				}
			}
			// Just moveTo when we're safely behind walls
			if (!!target && !this.hardPath) {
				// this.moveTo(target.pos);
				if (target.hits < target.hitsMax && target.pos.x < 47 && target.pos.roomName === this.creep.pos.roomName) {
					// this.creep.move(this.creep.pos.getDirectionTo(target));
					this.moveTo(target.pos);
				} else {
					delete this.creep.memory.target;
					delete this.creep.memory.targetPath;
					target = undefined;
				}
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
			}
		}
	}

	public action(): boolean {
		if (this.creep.hits === this.creep.hitsMax) {
			delete this.creep.memory.waitForHealth;
		}
		if (this.heal(true)) { // Reverse targeting for Tanks.
			this.rangedHeal();
		}
		this.move();
		return true;
	}
}
