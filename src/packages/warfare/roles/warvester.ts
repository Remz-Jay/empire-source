import WarfareCreepAction from "../warfareCreepAction";

export interface IWarvester {
	action(): boolean;
}

let roomCallback = function (roomName: string): CostMatrix {
	try {
		let room = Game.rooms[roomName];
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
		console.log(JSON.stringify(e), "Dismantler.roomCallback", roomName);
		return new PathFinder.CostMatrix();
	}
};

export default class Warvester extends WarfareCreepAction implements IWarvester {

	public setCreep(creep: Creep, positions?: RoomPosition[]) {
		super.setCreep(creep, positions);
	}

	public checkTough(): boolean {
		return (this.creep.getActiveBodyparts(TOUGH) > 0);
	}

	public moveToHeal(): boolean {
		if (!this.checkTough() || this.creep.memory.waitForHealth) {
			this.creep.memory.waitForHealth = true;
			this.creep.memory.positionIterator = this.positionIterator = 0;
			if (!this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
				this.moveTo(this.positions[this.positionIterator]);
			}
			return false;
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
				swampCost: 10,
				maxOps: 500,
				roomCallback: roomCallback,
			});
			let pos = path.path[0];
			console.log(`${this.creep.name} - ${this.creep.memory.role} - moveToSafeRange #${++this.moveIterator}`);
			this.creep.move(this.creep.pos.getDirectionTo(pos));
			return false;
		}
		return true;
	}

	public isBagEmpty(): boolean {
		delete this.creep.memory.bagFull;
		return (this.creep.carry.energy === 0);
	}

	public isBagFull(): boolean {
		return (_.sum(this.creep.carry) === this.creep.carryCapacity) ? true : false;
	}

	public warvest(): boolean {
		if (!this.positions) {
			return false;
		}
		if (!this.isBagFull()) {
			if (this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
				let mineral = this.creep.room.lookForAt<Mineral>(LOOK_MINERALS, this.positions[this.positionIterator]);
				if (mineral.length > 0) {
					// this.creep.say("H");
					this.creep.harvest(mineral[0]);
					return false;
				} else {
					return true;
				}
			}
			// TODO: Flexibilize this condition
		} else if (this.isBagFull() && this.positionIterator === 5 && this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
			this.positionIterator = this.creep.memory.positionIterator = 6;
		} else if (this.creep.pos.isNearTo(this.creep.room.terminal)) {
			let status = this.creep.transfer(this.creep.room.terminal, this.getMineralTypeFromStore(this.creep));
			if (status === OK) {
				// this.creep.say("Dump");
				this.positionIterator = this.creep.memory.positionIterator = 0;
				return false;
			}
		}
		return true;
	}

	public move(): boolean {
		if (!this.positions) {
			return false;
		}
		if (this.positionIterator < this.positions.length) {
			if (!this.creep.pos.isEqualTo(this.positions[this.positionIterator])) {
				let pfg: PathFinderGoal = this.createPathFinderMap(<RoomPosition> this.positions[this.positionIterator], 0);
				// this.creep.say(pfg[0].pos.x + "," + pfg[0].pos.y + "," + pfg[0].range);
				this.moveTo(pfg);
			} else {
				this.positionIterator = ++this.creep.memory.positionIterator;
				return this.move();
			}
			return true;
		}
		return false;
	}

	public action(): boolean {
		if (this.creep.room.name === this.creep.memory.homeRoom && this.isBagEmpty()) {
			if (this.creep.ticksToLive < 550) {
				this.creep.memory.hasRenewed = false;
			}
			if (!this.renewCreep()) {
				return false;
			}
		}
		if (this.warvest()) {
			this.move();
		}
		return true;
	}
}
