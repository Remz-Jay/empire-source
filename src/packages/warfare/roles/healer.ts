// import * as RoomManager from "../../../components/rooms/roomManager";
import WarfareCreepAction from "../warfareCreepAction";

export interface IHealer {
	action(): boolean;
}

/*let roomCallback = function (roomName: string): CostMatrix {
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
};*/

export default class Healer extends WarfareCreepAction implements IHealer {

	public hardPath: boolean = false;
	public boosts: string[] = [
		RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE, // +300% heal and rangedHeal effectiveness
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
	];

	public setCreep(creep: Creep, positions: RoomPosition[]) {
		// We require the next bit to have the healer stand at one checkpoint behind the rest.
/*		let posarr = positions.slice(); // Need a copy, or pop() and splice() will modify the original.
		posarr.splice(-1, 1); // Remove the last position, because it's in hostile territory.
		super.setCreep(creep, posarr);*/
		super.setCreep(creep, positions);
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
		let targets = this.creep.pos.findInRange(this.creep.room.hostileCreeps, 4, {
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
				swampCost: 10,
				roomCallback: this.roomCallback,
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
		if (!this.moveUsingPositions()) {
			delete this.creep.memory.targetPath;
			let closest = this.creep.pos.findClosestByRange(this.creep.room.myCreeps, {
				filter: (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(WORK) > 1,
			});
			if (!closest) {
				closest = this.creep.pos.findClosestByRange(this.creep.room.myCreeps, {
					filter: (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(HEAL) < 6,
				});
			}
			if (!!closest && !this.creep.pos.isNearTo(closest)) {
				// get in range
				this.creep.moveTo(closest);
			} else if (!!closest) {
				// stay in range
				this.creep.move(this.creep.pos.getDirectionTo(closest.pos));
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
		if (this.getBoosted()) {
			this.move();
		}
		return true;
	}
}
