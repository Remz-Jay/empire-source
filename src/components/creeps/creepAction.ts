import * as Config from "../../config/config";
import * as RoomManager from "../rooms/roomManager";
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
	moveTo(target: RoomPosition|PathFinderGoal): string | number;

	needsRenew(): boolean;
	pickupResourcesInRange(): void;
	nextStepIntoRoom(): boolean;

	action(): boolean;

	createPathFinderMap(goals: List<RoomPosition>|RoomPosition, range: number): PathFinderGoal;
	deserializePathFinderPath(pathFinderArray: Array<any>): RoomPosition[];
	findPathFinderPath(goal: PathFinderGoal): RoomPosition[] | boolean;
}

export default class CreepAction implements ICreepAction {
	public creep: Creep;
	public renewStation: Spawn;
	public governor: CreepGovernor;
	public fleeRange: number = 5;
	public _minLifeBeforeNeedsRenew: number = Config.DEFAULT_MIN_LIFE_BEFORE_NEEDS_REFILL;
	public moveIterator: number = 0;
	public setCreep(creep: Creep) {
		this.creep = creep;
	}

	public setGovernor(governor: CreepGovernor): void {
		this.governor = governor;
	}
	public roomCallback = function (roomName: string): CostMatrix | boolean {
		try {
			if (roomName === "W4N43") {
				return false;
			}
			let room = RoomManager.getRoomByName(roomName);
			if (!room) {
				return;
			}
			return room.getCreepMatrix();
		} catch (e) {
			console.log(e.message, "creepAction.roomCallback", roomName);
			return new PathFinder.CostMatrix();
		}
	};
	/**
	 * If we're on an EXIT_, make sure we do one step into the room before continuing
	 * To avoid room switching.
	 * Returns false if we're not on an EXIT_.
	 * @returns {boolean|RoomPosition}
	 */
	public nextStepIntoRoom(): boolean {
		if (this.creep.pos.x === 0) {
			Memory.log.move.push(`${this.creep.name} - ${this.creep.memory.role} - nextStepIntoRoom #${++this.moveIterator}`);
			this.creep.move(RIGHT);
			return false;
		}
		if (this.creep.pos.x === 49) {
			Memory.log.move.push(`${this.creep.name} - ${this.creep.memory.role} - nextStepIntoRoom #${++this.moveIterator}`);
			this.creep.move(LEFT);
			return false;
		}
		if (this.creep.pos.y === 0) {
			Memory.log.move.push(`${this.creep.name} - ${this.creep.memory.role} - nextStepIntoRoom #${++this.moveIterator}`);
			this.creep.move(BOTTOM);
			return false;
		}
		if (this.creep.pos.y === 49) {
			Memory.log.move.push(`${this.creep.name} - ${this.creep.memory.role} - nextStepIntoRoom #${++this.moveIterator}`);
			this.creep.move(TOP);
			return false;
		}
		return true;
	};

	public flee(): boolean {
		if (this.creep.room.hostileCreeps.length > 0) {
			let fleeRange = this.fleeRange;
			let targets = this.creep.room.hostileCreeps.filter((c: Creep) => c.pos.inRangeTo(this.creep.pos, fleeRange));
			if (targets.length > 0) {
				let minRange = fleeRange;
				targets.forEach((c: Creep) => {
					let rangeToTarget = this.creep.pos.getRangeTo(c);
					if (rangeToTarget < minRange) {
						minRange = rangeToTarget;
					}
				});
				this.creep.say(minRange.toString());
				if (minRange < fleeRange) {
					let goals = _.map(targets, function(t: Creep) { return {pos: t.pos, range: fleeRange}; });
					let path = PathFinder.search(this.creep.pos, goals, {
						flee: true,
						maxRooms: 2,
						plainCost: 2,
						swampCost: 10,
						maxOps: 500,
						roomCallback: this.roomCallback,
					});
					Memory.log.move.push(`${this.creep.name} - ${this.creep.memory.role} - flee #${++this.moveIterator}`);
					this.creep.move(this.creep.pos.getDirectionTo(path.path[0]));
					this.creep.say("FLEE!");
				} else {
					this.creep.cancelOrder("move");
				}
				return false;
			}
		}
		return true;
	}

	public comparePfg(l: PathFinderGoal, r: PathFinderGoal): boolean {
		let retVal = true;
		l.forEach((pi: PathFinderItem, idx: number) => {
			if (pi.pos.x !== r[idx].pos.x || pi.pos.y !== r[idx].pos.y || pi.pos.roomName !== r[idx].pos.roomName) {
				retVal = false;
			}
		}, this);
		return retVal;
	}

	public moveTo(target: RoomPosition|PathFinderGoal, retry: boolean = false): string | number {
		try {
			let pfg: PathFinderGoal = (target instanceof RoomPosition) ? this.createPathFinderMap(<RoomPosition> target ) : target;
			let path: RoomPosition[] = [];
			if (!!this.creep.memory.pfg && this.comparePfg(pfg, this.creep.memory.pfg) && !!this.creep.memory.pfgPath) {
				path = this.deserializePathFinderPath(this.creep.memory.pfgPath);
			} else {
				path = this.findPathFinderPath(pfg);
				if (!!path && path.length) {
					this.creep.memory.pfg = pfg;
					this.creep.memory.pfgPath = path;
				} else {
					this.creep.memory.pfgPath = undefined;
					return ERR_NOT_FOUND;
				}
			}
			if (path.length < 1) {
				this.creep.memory.pfgPath = undefined;
				return ERR_NOT_FOUND;
			}
			if (!!this.creep.memory.lastPosition) {
				let lp = this.creep.memory.lastPosition;
				if (lp.x === this.creep.pos.x && lp.y === this.creep.pos.y && lp.roomName === this.creep.pos.roomName) {
					this.creep.memory.stuckTicks = (!!this.creep.memory.stuckTicks) ? this.creep.memory.stuckTicks + 1 : 1;
					if (this.creep.memory.stuckTicks > 2) {
						Memory.log.creeps.push(`moveTo: ${this.creep.name} (${this.creep.memory.role}) is stuck at `
							+ `${JSON.stringify(lp)} for ${this.creep.memory.stuckTicks}. Recalculating route.`);
						this.creep.memory.stuckTicks = undefined;
						this.creep.memory.lastPosition = undefined;
						this.creep.memory.pfgPath = undefined;
						return (retry) ? ERR_NOT_FOUND : this.moveTo(pfg, true);
					}
				} else {
					delete this.creep.memory.stuckTicks;
				}
			}
			let pos = path.shift();
			if (this.creep.pos.isEqualTo(pos)) {
				pos = path.shift();
			}
			if (this.creep.pos.isNearTo(pos)) {
				Memory.log.move.push(`${this.creep.name} - ${this.creep.memory.role} - moveTo #${++this.moveIterator}`);
				let status = this.creep.move(this.creep.pos.getDirectionTo(pos));
				if (status === OK) {
					this.creep.memory.lastPosition = this.creep.pos;
					this.creep.memory.pfgPath = path;
				} else if (status === ERR_TIRED) {
					// Delete the lastPosition, because the creep hasn't moved due to it being tired. No need to recalculate route now.
					this.creep.memory.lastPosition = undefined;
					this.creep.memory.stuckTicks = undefined;
				}
				return status;
			} else {
				console.log(`${this.creep.memory.role} ${this.creep.room.name} Went off path, recalculating`);
				this.creep.memory.stuckTicks = undefined;
				this.creep.memory.lastPosition = undefined;
				this.creep.memory.pfgPath = undefined;
				return (retry) ? ERR_NOT_FOUND : this.moveTo(pfg, true);
			}
		} catch (e) {
			console.log(e.message, JSON.stringify(target), "creepAction.moveTo");
			// fall back to regular move.
			if (!(target instanceof RoomPosition)) {
				target = new RoomPosition(target[0].pos.x, target[0].pos.y, target[0].pos.roomName);
			}
			this.creep.moveTo(<RoomPosition> target, {reusePath: 25});
		}
	}
	public findNewPath(target: RoomObject | RoomPosition, memoryName: string = "targetPath", move: boolean = true, range: number = 1): boolean {
		let pos: RoomPosition = (target instanceof RoomObject) ? target.pos : target;
		let path = this.findPathFinderPath(this.createPathFinderMap(pos, range));
		if (!!path) {
			this.creep.memory[memoryName] = path;
			if (move) {
				return this.moveByPath(path, target, memoryName);
			}
		} else {
			return false;
		}
	};
	public moveByPath(path: RoomPosition[], target: RoomObject | RoomPosition, memoryName: string = "targetPath"): boolean {
		if (!!this.creep.memory.lastPosition) {
			let lp = this.creep.memory.lastPosition;
			if (lp.x === this.creep.pos.x && lp.y === this.creep.pos.y && lp.roomName === this.creep.pos.roomName) {
				this.creep.memory.stuckTicks = (!!this.creep.memory.stuckTicks) ? this.creep.memory.stuckTicks + 1 : 1;
				if (this.creep.memory.stuckTicks > 1) {
					Memory.log.creeps.push(`moveByPath: ${this.creep.name} (${this.creep.memory.role}) is stuck at `
						+ `${JSON.stringify(lp)} for ${this.creep.memory.stuckTicks}. Recalculating route.`);
					delete this.creep.memory.stuckTicks;
					delete this.creep.memory.lastPosition;
					// TODO: Figure out this recursive mess..
					this.findNewPath(target, memoryName, false);
				}
			} else {
				delete this.creep.memory.stuckTicks;
			}
		}
		this.creep.memory.lastPosition = this.creep.pos;
		let status = this.creep.moveByPath(path);
		switch (status) {
			case ERR_NOT_FOUND:
				delete this.creep.memory[memoryName];
				if (!!target) {
					this.findNewPath(target, memoryName, false);
				}
				break;
			case ERR_TIRED:
				// Delete the lastPosition, because the creep hasn"t moved due to it being tired. No need to recalculate route now.
				delete this.creep.memory.lastPosition;
				delete this.creep.memory.stuckTicks;
				return true;
			case OK:
				return true;
			default:
				throw new Error("Uncaught moveBy status " + JSON.stringify(status) + " in Class.Creep.moveByPath.");
		}
	};

	public getMineralTypeFromStore(source: StorageStructure | Creep): string {
		let resource: string = RESOURCE_ENERGY;
		let s: any = (source instanceof Creep) ? source.carry : source.store;
		_.reduce(s, function(result, value, key) {
			if (_.isNumber(value) && value > result) {
				result = value;
				resource = key;
			}
			return result;
		}, 0);
		return resource;
	}

	public needsRenew(): boolean {
		return (this.creep.ticksToLive < this._minLifeBeforeNeedsRenew);
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
		let plainCost = 2;
		let swampCost = 6;
		if (_.sum(this.creep.carry) > (this.creep.carryCapacity / 2)) {
			plainCost = 2;
			swampCost = 10;
		}
		let path = PathFinder.search(this.creep.pos, goal, {
			// We need to set the defaults costs higher so that we
			// can set the road cost lower in `roomCallback`
			maxOps: 1750,
			plainCost: plainCost,
			swampCost: swampCost,
			roomCallback: this.roomCallback,
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
			targets = this.creep.room.allStructures.filter((s: StructureContainer) => s.structureType === STRUCTURE_CONTAINER
				&& s.store.energy > 0
				&& s.pos.isNearTo(this.creep.pos)
			);
			if (targets.length > 0) {
				this.creep.withdraw(targets.pop() as StructureContainer, RESOURCE_ENERGY);
			}
		}
	};

	public expireCreep(): boolean {
		// see if an upgrade for this creep is available
		if (!!this.creep.memory.homeRoom) {
			try {
				let room = RoomManager.getRoomByName(this.creep.memory.homeRoom);
				let x: number = this.governor.getNumberOfCreepsInRole();
				if (x > this.governor.getCreepLimit()) {
					Memory.log.creeps.push("Expiring creep " + this.creep.name + " (" + this.creep.memory.role + ") in room "
						+ room.name + " because we're over cap.");
					return true;
				}
				let body = this.governor.getBody();
				if (CreepGovernor.calculateRequiredEnergy(body)
					> CreepGovernor.calculateRequiredEnergy(_.pluck(this.creep.body, "type"))) {
					Memory.log.creeps.push("Expiring creep " + this.creep.name + " (" + this.creep.memory.role + ") in room "
						+ room.name + " for an upgrade.");
					return true;
				}
			} catch (e) {
				console.log(`creepAction.ExpireCreep: ${e.message}`);
				return false;
			}
		}
		return false;
	};
	public renewCreep(max: number = Config.MAX_TTL): boolean {
		let homeRoom = RoomManager.getRoomByName(this.creep.memory.homeRoom);
		if (this.creep.memory.hasRenewed !== undefined && this.creep.memory.hasRenewed === false && this.creep.ticksToLive > 350
			&& (((homeRoom.energyInContainers + homeRoom.energyAvailable) < homeRoom.energyCapacityAvailable)
			|| homeRoom.energyAvailable < 300)) {
			Memory.log.creeps.push("Not renewing creep " + this.creep.name + " (" + this.creep.memory.role + ") in room "
				+ homeRoom.name + " due to emergency energy level " + (homeRoom.energyAvailable));
			this.creep.memory.hasRenewed = true;
			delete this.creep.memory.renewStation;
			return true;
		}
		if (this.creep.ticksToLive < 250) {
			this.creep.memory.hasRenewed = false;
		}
		if (this.creep.memory.hasRenewed !== undefined && this.creep.memory.hasRenewed === false) {
			let renewStation: StructureSpawn;
			if (!this.creep.memory.renewStation) {
				renewStation = this.creep.pos.findClosestByPath(homeRoom.mySpawns, {
					algorithm: "astar",
					ignoreCreeps: true,
					costCallback: this.roomCallback,
					maxOps: 1000,
					maxRooms: 6,
				});
				if (!renewStation) {
					console.log("renewCreep.NO_PATH_FOUND");
					renewStation = homeRoom.getFreeSpawn();
				}
				this.creep.memory.renewStation = renewStation.id;
			} else {
				renewStation = Game.getObjectById<StructureSpawn>(this.creep.memory.renewStation);
			}
			if (!this.creep.pos.isNearTo(renewStation)) {
				Memory.log.creeps.push(`${_.padRight(this.creep.name, 10)}\t${_.padRight(this.creep.memory.role, 10)}\t${_.padRight(this.creep.ticksToLive.toString(), 4)}`
				+ ` is moving to ${renewStation.name} for renew.`);
				this.moveTo(renewStation.pos);
			} else {
				delete this.creep.memory.pfg;
				delete this.creep.memory.pfgPath;
				if (this.expireCreep()) {
					renewStation.recycleCreep(this.creep);
				} else {
					Memory.log.creeps.push(`${_.padRight(this.creep.name, 10)}\t${_.padRight(this.creep.memory.role, 10)}\t${_.padRight(this.creep.ticksToLive.toString(), 4)}`
					+ ` is waiting for renew at ${renewStation.name}`);
					if (this.creep.carry.energy > 0) {
						this.creep.transfer(renewStation, RESOURCE_ENERGY);
					}
					if (this.creep.ticksToLive > max) {
						this.creep.memory.hasRenewed = true;
						delete this.creep.memory.renewStation;
						delete this.creep.memory.renewPath;
					}
				}
			}
			return false;
		} else {
			return true;
		}
	};

	public harvestFromContainersAndSources() {
		if (!this.creep.memory.source) {
			// Prefer energy from containers
			let source: Structure | Source = this.creep.pos.findClosestByPath(this.creep.room.allStructures, {
				filter: (structure: StorageStructure | StructureLink) => (structure.structureType === STRUCTURE_CONTAINER
					|| structure.structureType === STRUCTURE_STORAGE
					|| structure.structureType === STRUCTURE_LINK
				) && (
					((structure instanceof StructureContainer || structure instanceof StructureStorage)
					&& !!structure.store && structure.store[RESOURCE_ENERGY] > (this.creep.carryCapacity - _.sum(this.creep.carry))) // containers and storage
					|| (structure instanceof StructureLink && !!structure.energy && structure.energy >= (this.creep.carryCapacity - _.sum(this.creep.carry))) // links
				),
				maxRooms: 1,
				algorithm: "astar",
				ignoreCreeps: true,
				costCallback: this.roomCallback,
				maxOps: 1000,
			}) as StorageStructure | StructureLink;
			// Go to source otherwise
			if (!source) {
				source = this.creep.pos.findClosestByPath(this.creep.room.mySpawns, {
					filter: (structure: Spawn) => structure.energy === structure.energyCapacity,
					algorithm: "astar",
					ignoreCreeps: true,
					costCallback: this.roomCallback,
					maxOps: 1000,
				}) as Spawn;
				if (!source) {
					source = this.creep.pos.findClosestByPath(this.creep.room.sources, {
						filter: (source: Source) => (source.energy > 100) || source.ticksToRegeneration < 30,
						algorithm: "astar",
						costCallback: this.roomCallback,
						maxOps: 1000,
						maxRooms: 6,
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
				if (!this.creep.pos.isNearTo(source)) {
					this.moveTo(source.pos);
				} else {
					let status = this.creep.withdraw(source, RESOURCE_ENERGY);
					switch (status) {
						case ERR_NOT_ENOUGH_RESOURCES:
						case ERR_INVALID_TARGET:
						case ERR_NOT_OWNER:
						case ERR_FULL:
							delete this.creep.memory.source;
							break;
						case OK:
							break;
						default:
							throw new Error(`Unhandled ERR in creep.source.container ${status}`);
					}
				}
			} else {
				if (!this.creep.pos.isNearTo(source)) {
					this.moveTo(source.pos);
				} else {
					let status = this.creep.harvest(source);
					switch (status) {
						case ERR_NOT_ENOUGH_RESOURCES:
						case ERR_INVALID_TARGET:
						case ERR_NOT_OWNER:
						case ERR_FULL:
							delete this.creep.memory.source;
							break;
						case OK:
							break;
						default:
							throw new Error(`Unhandled ERR in creep.source.harvest: ${status}`);
					}
				}
			}
		}
	}

	public action(): boolean {
		this.pickupResourcesInRange();
		return this.renewCreep();
	}
}
