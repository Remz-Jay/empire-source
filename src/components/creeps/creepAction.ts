import * as Config from "./../../config/config";
import List = _.List;

type PathFinderGoal = { pos: RoomPosition, range: number }[];
type PathFinderPath = { path: RoomPosition[], ops: number };

export interface ICreepAction {
	creep: Creep;
	renewStation: Spawn;
	_minLifeBeforeNeedsRenew: number;

	setCreep(creep: Creep): void;

	/**
	 * Wrapper for Creep.moveTo() method.
	 */
	moveTo(target: RoomPosition|PathFinderGoal): number;

	needsRenew(): boolean;
	tryRenew(): number;
	moveToRenew(): void;
	pickupResourcesInRange(): void;

	action(): boolean;

	createPathFinderMap(goals: List<RoomPosition>|RoomPosition, range: number): PathFinderGoal;
	deserializePathFinderPath(pathFinderArray: Array<any>): RoomPosition[];
	findPathFinderPath(goal: PathFinderGoal): RoomPosition[] | boolean;
}

let roomCallback = function (roomName: string): CostMatrix {
	try {
		let room = Game.rooms[roomName];
		if (!room) {
			return;
		}
		return room.getCreepMatrix();
	} catch (e) {
		console.log(JSON.stringify(e), "creepAction.roomCallback", roomName);
		return new PathFinder.CostMatrix();
	}

};

export default class CreepAction implements ICreepAction {
	public creep: Creep;
	public renewStation: Spawn;

	public _minLifeBeforeNeedsRenew: number = Config.DEFAULT_MIN_LIFE_BEFORE_NEEDS_REFILL;

	public setCreep(creep: Creep) {
		this.creep = creep;
		this.renewStation = Game.getObjectById<Spawn>(this.creep.memory.renew_station_id);
	}

	public moveTo(target: RoomPosition|PathFinderGoal) {
		try {
			let pfg: PathFinderGoal = (target instanceof RoomPosition) ? this.createPathFinderMap(<RoomPosition> target ) : target;
			let path: RoomPosition[] = this.findPathFinderPath(pfg);
			if (!!path) {
				let pos = path[0];
				return this.creep.move(this.creep.pos.getDirectionTo(pos));
			} else {
				return ERR_NOT_FOUND;
			}
		} catch (e) {
			console.log(JSON.stringify(target), "creepAction.moveTo");
			// fall back to regular move.
			this.creep.moveTo(<RoomPosition> target);
		}
	}

	public needsRenew(): boolean {
		return (this.creep.ticksToLive < this._minLifeBeforeNeedsRenew);
	}

	public tryRenew(): number {
		return this.renewStation.renewCreep(this.creep);
	}

	public moveToRenew(): void {
		if (this.tryRenew() === ERR_NOT_IN_RANGE) {
			this.moveTo(this.renewStation.pos);
		}
	}

	public createPathFinderMap(goals: List<RoomPosition>|RoomPosition, range: number = 1): PathFinderGoal {
		let goalsList: List<RoomPosition>;
		if (!_.isArray(goals)) {
			goalsList = [<RoomPosition> goals];
		} else {
			goalsList = goals as List<RoomPosition>;
		}
		return _.map(goalsList, function (source: RoomPosition) {
			// We can't actually walk on sources-- set `range` to 1 so we path
			// next to it.
			return {pos: source, range: range};
		});
	};

	public deserializePathFinderPath(pathFinderArray: Array<any>): RoomPosition[] {
		let path: RoomPosition[] = [];
		_.each(pathFinderArray, function (x) {
			path.push(new RoomPosition(x.x, x.y, x.roomName));
		}, this);
		return path;
	};

	public findPathFinderPath(goal: PathFinderGoal): RoomPosition[] {
		let plainCost = 3;
		let swampCost = 6;
		if (_.sum(this.creep.carry) > (this.creep.carryCapacity / 2)) {
			plainCost = 5;
			swampCost = 10;
		}
		let path = PathFinder.search(this.creep.pos, goal, {
			// We need to set the defaults costs higher so that we
			// can set the road cost lower in `roomCallback`
			plainCost: plainCost,
			swampCost: swampCost,
			roomCallback: roomCallback,
		});
		if (path.path.length < 1) {
			// We're near the target.
			return undefined;
		} else {
			return path.path;
		}
	};

	public pickupResourcesInRange(): void {
		if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
			let targets = this.creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
			if (targets.length > 0) {
				_.each(targets, function (t) {
					if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
						this.creep.pickup(t);
					}
				}, this);
			}
			targets = this.creep.pos.findInRange(FIND_STRUCTURES, 1, {
				filter: (s: StructureContainer) => {
					return s.structureType === STRUCTURE_CONTAINER
						&& s.store[RESOURCE_ENERGY] > 0;
				},
			});
			if (targets.length > 0) {
				_.each(targets, function (t) {
					if (_.sum(this.creep.carry) < this.creep.carryCapacity) {
						this.creep.withdraw(t);
					}
				}, this);
			}
		}
	};

	public action(): boolean {
		this.pickupResourcesInRange();
		return true;
	}
}
