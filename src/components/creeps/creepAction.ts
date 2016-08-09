import * as Config from "./../../config/config";
import List = _.List;
import CreepGovernor from "./creepGovernor";

export interface ICreepAction {
	creep: Creep;
	governor: CreepGovernor;
	renewStation: Spawn;
	_minLifeBeforeNeedsRenew: number;

	setCreep(creep: Creep): void;
	setGovernor(governor: CreepGovernor): void;
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
	public governor: CreepGovernor;

	public _minLifeBeforeNeedsRenew: number = Config.DEFAULT_MIN_LIFE_BEFORE_NEEDS_REFILL;

	public setCreep(creep: Creep) {
		this.creep = creep;
		this.renewStation = Game.getObjectById<Spawn>(this.creep.memory.homeSpawn);
	}

	public setGovernor(governor: CreepGovernor): void {
		this.governor = governor;
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
	public findNewPath(target: RoomObject, memoryName: string = "targetPath", move: boolean = true): boolean {
		let path = this.findPathFinderPath(this.createPathFinderMap(target.pos));
		if (!!path) {
			this.creep.memory[memoryName] = path;
			if (move) {
				return this.moveByPath(path, target, memoryName);
			}
		} else {
			return false;
		}
	};
	public moveByPath(path: RoomPosition[], target: RoomObject, memoryName: string = "targetPath"): boolean {
		if (!!this.creep.memory.lastPosition) {
			let lp = this.creep.memory.lastPosition;
			if (lp.x === this.creep.pos.x && lp.y === this.creep.pos.y && lp.roomName === this.creep.pos.roomName) {
				console.log(this.creep.name + " (" + this.creep.memory.role + ") is stuck at "
					+ JSON.stringify(lp) + ". Recalculating route.");
				delete this.creep.memory.lastPosition;
				this.findNewPath(target, memoryName);
			}
		}
		this.creep.memory.lastPosition = this.creep.pos;
		let status = this.creep.moveByPath(path);
		switch (status) {
			case ERR_NOT_FOUND:
				delete this.creep.memory[memoryName];
				if (!!target) {
					return this.findNewPath(target, memoryName);
				}
				break;
			case ERR_TIRED:
				// Delete the lastPosition, because the creep hasn"t moved due to it being tired. No need to recalculate route now.
				delete this.creep.memory.lastPosition;
				return true;
			case OK:
				return true;
			default:
				console.log("Uncaught moveBy status " + JSON.stringify(status) + " in Class.Creep.moveByPath.");
		}
	};

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
			// We can"t actually walk on sources-- set `range` to 1 so we path
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
			// We"re near the target.
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

	public expireCreep(): boolean {
		// see if an upgrade for this creep is available
		if (!!this.creep.memory.homeRoom && !!this.creep.memory.homeSpawn) {
			try {
				let room = Game.rooms[this.creep.memory.homeRoom];
				let x: number = this.governor.getNumberOfCreepsInRole();
				if (x > this.governor.getCreepLimit()) {
					console.log("Expiring creep " + this.creep.name + " (" + this.creep.memory.role + ") in room "
						+ room.name + " because we\"re over cap.");
					return true;
				}
				let body = this.governor.getBody();
				if (CreepGovernor.calculateRequiredEnergy(body)
					> CreepGovernor.calculateRequiredEnergy(_.pluck(this.creep.body, "type"))) {
					console.log("Expiring creep " + this.creep.name + " (" + this.creep.memory.role + ") in room "
						+ room.name + " for an upgrade.");
					return true;
				}
			} catch (e) {
				console.log(JSON.stringify(e), "this.creep.renewCreep.ExpireCreep");
				return false;
			}

		}
		return false;
	};
	public renewCreep(max: number = 1000): boolean {
		if (this.creep.ticksToLive < 250
			&& (this.creep.room.energyInContainers + this.creep.room.energyAvailable) < this.creep.room.energyCapacityAvailable) {
			console.log("Not renewing creep " + this.creep.name + " (" + this.creep.memory.role + ") in room "
				+ this.creep.room.name + " due to emergency energy level " + (this.creep.room.energyInContainers + this.creep.room.energyAvailable));
			return true;
		}
		if (this.creep.ticksToLive < 250) {
			this.creep.memory.hasRenewed = false;
		}
		if (this.creep.memory.hasRenewed !== undefined && this.creep.memory.hasRenewed === false) {
			let spawns: Spawn[] = <Spawn[]> this.creep.room.find(FIND_MY_SPAWNS);
			let renewStation: Spawn;
			if (spawns.length > 0) {
				// if(spawns.length > 0 && this.creep.room.controller.level > 1 && UtilCreep.calculateRequiredEnergy(_.pluck(this.creep.body, "type"))
				// < this.creep.room.energyCapacityAvailable){
				renewStation = spawns[0];
				// } else {
				//    renewStation = (undefined === this.creep.memory.homeSpawn) ? Game.spawns["Bastion"] : Game.spawns[this.creep.memory.homeSpawn];
				// }
			} else {
				renewStation = (!this.creep.memory.homeSpawn) ? this.creep.room.find<Spawn>(FIND_MY_SPAWNS)[0] : Game.spawns[this.creep.memory.homeSpawn];
			}
			let status: number;
			let phrase: string;
			if (this.expireCreep()) {
				status = renewStation.recycleCreep(this.creep);
				phrase = "demolition.";
			} else {
				status = renewStation.renewCreep(this.creep);
				phrase = "renew.";
			}
			switch (status) {
				case ERR_NOT_IN_RANGE:
					console.log(this.creep.name + " (" + this.creep.memory.role + ") is moving to "
						+ renewStation.name + " for " + phrase);
					if (!this.creep.memory.renewPath) {
						this.findNewPath(renewStation, "renewPath");
					} else {
						let path = this.deserializePathFinderPath(this.creep.memory.renewPath);
						this.moveByPath(path, renewStation, "renewPath");
					}
					break;
				case OK:
					console.log(this.creep.name + " (" + this.creep.memory.role + ") renewed at "
						+ renewStation.name + ". now at " + this.creep.ticksToLive);
					if (this.creep.ticksToLive > max) {
						console.log("Done renewing.");
						this.creep.memory.hasRenewed = true;
						delete this.creep.memory.renewPath;
					}
					break;
				case ERR_FULL:
					this.creep.memory.hasRenewed = true;
					delete this.creep.memory.renewPath;
					break;
				case ERR_BUSY:
				case ERR_NOT_ENOUGH_ENERGY:
					console.log(this.creep.name + " (" + this.creep.memory.role + ") is waiting for renew at " + renewStation.name + ".");
					if (this.creep.carry.energy > 0) {
						this.creep.transfer(renewStation, RESOURCE_ENERGY);
					}
					break;
				default:
					console.log("Uncaught Creep Renew Error" + JSON.stringify(status));
			}
			return false;
		} else {
			return true;
		}
	};

	public harvestFromContainersAndSources() {
		if (!this.creep.memory.source) {
			// Prefer energy from containers
			let source: Structure | Source = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
				filter: (structure: StorageStructure | StructureLink) => (structure.structureType === STRUCTURE_CONTAINER
					|| structure.structureType === STRUCTURE_STORAGE
					|| structure.structureType === STRUCTURE_LINK
				) && (
					((structure instanceof StructureContainer || structure instanceof StructureStorage)
					&& !!structure.store && structure.store[RESOURCE_ENERGY] > (this.creep.carryCapacity - _.sum(this.creep.carry))) // containers and storage
					|| (structure instanceof StructureLink && !!structure.energy && structure.energy > (this.creep.carryCapacity - _.sum(this.creep.carry))) // links
				),
				maxRooms: 1,
			}) as StorageStructure | StructureLink;
			// Go to source otherwise
			if (!source) {
				source = this.creep.pos.findClosestByPath(FIND_MY_SPAWNS, {
					filter: (structure: Spawn) => structure.energy === structure.energyCapacity
					&& structure.room.name === this.creep.room.name,
				}) as Spawn;
				if (!source) {
					source = this.creep.pos.findClosestByPath(FIND_SOURCES, {
						filter: (source: Source) => (source.energy > 100) || source.ticksToRegeneration < 30,
					}) as Source;
				}
			}
			if (!!source) {
				this.creep.memory.source = source.id;
			}
		}
		if (!!this.creep.memory.source) {
			let source: Structure | Source = Game.getObjectById(this.creep.memory.source) as Structure | Source;
			if (source instanceof Structure) { // Sources aren't structures
				let status = this.creep.withdraw(source, RESOURCE_ENERGY);
				switch (status) {
					case ERR_NOT_ENOUGH_RESOURCES:
					case ERR_INVALID_TARGET:
					case ERR_NOT_OWNER:
					case ERR_FULL:
						delete this.creep.memory.source;
						break;
					case ERR_NOT_IN_RANGE:
						this.moveTo(source.pos);
						break;
					case OK:
						break;
					default:
						console.log(`Unhandled ERR in creep.source.container ${status}`);
				}
			} else {
				let status = this.creep.harvest(source);
				switch (status) {
					case ERR_NOT_ENOUGH_RESOURCES:
					case ERR_INVALID_TARGET:
					case ERR_NOT_OWNER:
					case ERR_FULL:
						delete this.creep.memory.source;
						break;
					case ERR_NOT_IN_RANGE:
						this.moveTo(source.pos);
						break;
					case OK:
						break;
					default:
						console.log(`Unhandled ERR in creep.source.harvest: ${status}`);
				}
			}
		}
	}

	public action(): boolean {
		if (!this.renewCreep()) {
			return false;
		}
		this.pickupResourcesInRange();
		return true;
	}
}
