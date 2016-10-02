import List = _.List;
import CreepGovernor from "./creepGovernor";
export interface ICreepAction {
	creep: Creep;
	governor: CreepGovernor;
	renewStation: Spawn;

	setCreep(creep: Creep): void;
	setGovernor(governor: CreepGovernor): void;
	/**
	 * Wrapper for Creep.moveTo() method.
	 */
	moveTo(target: RoomPosition|PathFinderGoal): string | number;
	pickupResourcesInRange(): void;

	action(startCpu: number): boolean;

	createPathFinderMap(goals: List<RoomPosition>|RoomPosition, range: number): PathFinderGoal;
	deserializePathFinderPath(pathFinderArray: Array<any>): RoomPosition[];
	findPathFinderPath(goal: PathFinderGoal): RoomPosition[] | boolean;
	moveToTargetRoom(): void;
}

export default class CreepAction implements ICreepAction {
	public creep: Creep;
	public renewStation: Spawn;
	public governor: CreepGovernor;
	public fleeRange: number = 5;
	public moveIterator: number = 0;
	public boosts: string[] = [];
	public hasBoosts: string[] = [];
	public startCpu: number = 0;

	public setCreep(creep: Creep) {
		this.creep = creep;
		if (!this.creep.memory.hasBoosts) {
			this.creep.memory.hasBoosts = [];
		}
		this.hasBoosts = this.creep.memory.hasBoosts;
	}

	public setGovernor(governor: CreepGovernor): void {
		this.governor = governor;
	}
	public roomCallback = function (roomName: string): CostMatrix | boolean {
		try {
			if (roomName === "W4N43") {
				return false;
			}
			const room = Game.rooms[roomName];
			if (!room) {
				return;
			}
			return room.getCostMatrix(false); // The cached one without per-tick creeps.
		} catch (e) {
			console.log(e.message, "creepAction.roomCallback", roomName);
			return new PathFinder.CostMatrix();
		}
	};
	public creepCallback = function (roomName: string): CostMatrix | boolean {
		try {
			if (roomName === "W4N43") {
				return false;
			}
			const room = Game.rooms[roomName];
			if (!room) {
				return;
			}
			return room.getCreepMatrix(); // Uncached, with per-tick creep updates.
		} catch (e) {
			console.log(e.message, "creepAction.creepCallback", roomName);
			return new PathFinder.CostMatrix();
		}
	};
	public ignoreCallback = function (roomName: string): CostMatrix | boolean {
		try {
			if (roomName === "W4N43") {
				return false;
			}
			const room = Game.rooms[roomName];
			if (!room) {
				return;
			}
			return room.getCostMatrix(true); // The cached one without per-tick creeps.
		} catch (e) {
			console.log(e.message, "creepAction.ignoreCallback", roomName);
			return new PathFinder.CostMatrix();
		}
	};

	public flee(): boolean {
		if (this.creep.room.hostileCreeps.length > 0) {
			const fleeRange = this.fleeRange;
			const targets = this.creep.room.hostileCreeps.filter(
				(c: Creep) => (c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0)
				&& c.pos.inRangeTo(this.creep.pos, fleeRange)
			);
			if (targets.length > 0) {
				let minRange = fleeRange;
				targets.forEach((c: Creep) => {
					const rangeToTarget = this.creep.pos.getRangeTo(c);
					if (rangeToTarget < minRange) {
						minRange = rangeToTarget;
					}
				});
				this.creep.say(minRange.toString());
				if (minRange < fleeRange) {
					const goals = _.map(targets, function(t: Creep) { return {pos: t.pos, range: fleeRange}; });
					const path = PathFinder.search(this.creep.pos, goals, {
						flee: true,
						maxRooms: 2,
						plainCost: 2,
						swampCost: 10,
						maxOps: 500,
						roomCallback: this.roomCallback,
					});
					this.creep.move(this.creep.pos.getDirectionTo(path.path[0]));
					const phrases: string[] = [
						"Mommy!",
						"KKTHNXBYE!",
						"$%&# This!",
						"Call 911!",
						"Oh HELL no",
						"Catch me!",
						"OKDOEI.",
						"Aaaaaaaah!",
						"No. No. NO",
						"*scared*",
						"*sobbing*",
					];
					this.creep.say(phrases[_.random(0, phrases.length - 1)], true);
				} else {
					this.creep.cancelOrder("move");
				}
				return false;
			}
		}
		return true;
	}

	public serializePathFinderPath(pfgPath: RoomPosition[]): number[] {
		let serialized: number[] = [];
		pfgPath.forEach((r: RoomPosition) => {
			serialized.push(global.cantorPair(r.x, r.y));
		});
		return serialized;
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

	public getRouteCache(from: Structure | Source, to: Structure | Source): number[] {
		let route: number[] = [];
		if (!!Memory.pathCache[from.id] && !!Memory.pathCache[from.id][to.id]) {
			route = Memory.pathCache[from.id][to.id];
		} else if (!!Memory.pathCache[to.id] && !!Memory.pathCache[to.id][from.id]) {
			route = Memory.pathCache[to.id][from.id].reverse();
		} else {
			const path = this.findPathFinderPath(this.createPathFinderMap(<RoomPosition> to.pos), true, false, from.pos, 10, 20);
			if (!!path && path.length > 0) {
				route = this.serializePathFinderPath(path);
				if (!!Memory.pathCache[from.id]) {
					Memory.pathCache[from.id][to.id] = route;
				} else if (!!Memory.pathCache[to.id]) {
					Memory.pathCache[to.id][from.id] = route.reverse();
				} else {
					Memory.pathCache[from.id] = {};
					Memory.pathCache[from.id][to.id] = route;
				}
			} else {
				return undefined;
			}
		}
		return route;
	}
	public cachedMoveTo(from: Structure | Source, to: Structure | Source) {
		const range = (to instanceof Source
		|| (to.structureType !== STRUCTURE_CONTAINER && to.structureType !== STRUCTURE_ROAD && to.structureType !== STRUCTURE_RAMPART)) ? 1 : 0;
		const pfg: PathFinderGoal = this.createPathFinderMap(<RoomPosition> to.pos, range);
		if (!!this.creep.memory.pfg && _.isArray(this.creep.memory.pfgPath) && this.creep.memory.pfgPath.length > 0 && this.comparePfg(pfg, this.creep.memory.pfg)) {
			return this.moveTo(pfg);
		} else {
			let route = this.getRouteCache(from, to);
			if (!!route) {
				this.creep.memory.pfgPath = route;
				this.creep.memory.pfg = pfg;
				return this.moveTo(pfg);
			} else {
				this.creep.memory.pfgPath = undefined;
				return ERR_NOT_FOUND;
			}
		}
	}
	public moveTo(target: RoomPosition|PathFinderGoal, retry: boolean = false): string | number {
		if (this.creep.fatigue > 0 || this.creep.getActiveBodyparts(MOVE) === 0) {
			return ERR_TIRED;
		}
		try {
			const pfg: PathFinderGoal = (target instanceof RoomPosition) ? this.createPathFinderMap(<RoomPosition> target ) : target;
			let path: number[] = [];
			if (!!this.creep.memory.pfg && _.isArray(this.creep.memory.pfgPath) && this.creep.memory.pfgPath.length > 0 && this.comparePfg(pfg, this.creep.memory.pfg)) {

				path = this.creep.memory.pfgPath as number[];
				if (path.length < 1) {
					this.creep.memory.pfgPath = undefined;
					this.creep.memory.pfg = undefined;
					this.creep.memory.lastPosition = undefined;
					return ERR_NOT_FOUND;
				}
			} else {
				this.creep.memory.lastPosition = undefined;
				let ignoreCreeps = !retry;
				if (this.creep.pos.getRangeTo(pfg[0].pos) < 3) {
					ignoreCreeps = false;
				}
				const pfPath = this.findPathFinderPath(pfg, ignoreCreeps);
				if (!!pfPath && pfPath.length > 0) {
					this.creep.memory.pfg = pfg;
					path = this.serializePathFinderPath(pfPath);
				} else {
					this.creep.memory.pfgPath = undefined;
					return ERR_NOT_FOUND;
				}
			}
			if (!_.isNumber(path[0])) {
				this.creep.memory.stuckTicks = undefined;
				this.creep.memory.lastPosition = undefined;
				this.creep.memory.pfgPath = undefined;
				this.creep.memory.moveAttempt = undefined;
				return this.moveTo(pfg, true);
			}
			if (!!this.creep.memory.lastPosition) {
				const lp = this.creep.memory.lastPosition;
				if (lp.x === this.creep.pos.x && lp.y === this.creep.pos.y && lp.roomName === this.creep.pos.roomName) {
					this.creep.memory.stuckTicks = (!!this.creep.memory.stuckTicks) ? this.creep.memory.stuckTicks + 1 : 1;
					if (this.creep.memory.stuckTicks > 1) {
						this.creep.memory.stuckTicks = undefined;
						this.creep.memory.lastPosition = undefined;
						this.creep.memory.pfgPath = undefined;
						this.creep.memory.moveAttempt = undefined;
						this.creep.say("You win.");
						return (retry) ? ERR_NOT_FOUND : this.moveTo(pfg, true);
					} else {
						const phrases = [
							"Pardon me.",
							"'scuse me.",
							"Move it!",
							"Squeeze in",
						];
						this.creep.say(phrases[_.random(0, phrases.length - 1)], true);
						if (!!this.creep.memory.moveAttempt) {
							path.unshift(this.creep.memory.moveAttempt);
						}
					}
				} else {
					delete this.creep.memory.stuckTicks;
				}
			}
			let pos = this.deserializePathFinderPosition(path[0]);
			while (this.creep.pos.isEqualTo(pos) || pos.roomName !== this.creep.room.name) {
				if (path.length > 0) {
					pos = this.deserializePathFinderPosition(path.shift());
				} else {
					this.creep.memory.pfgPath = undefined;
					this.creep.memory.pfg = undefined;
					this.creep.memory.lastPosition = undefined;
					this.creep.memory.moveAttempt = undefined;
					return ERR_NOT_FOUND;
				}
			}
			if (this.creep.pos.isNearTo(pos)) {
				this.creep.memory.lastPosition = this.creep.pos;
				this.creep.memory.pfgPath = path;
				this.creep.memory.moveAttempt = global.cantorPair(pos.x, pos.y);
				return this.creep.move(this.creep.pos.getDirectionTo(pos));
			} else {
				this.creep.memory.lastPosition = undefined;
				const distance = this.creep.pos.getRangeTo(pos);
				if (distance === 2) {
					this.creep.say("Catchup");
					return this.creep.moveTo(pos);
				} else {
					this.creep.memory.stuckTicks = undefined;
					this.creep.memory.pfgPath = undefined;
					this.creep.memory.lastPosition = undefined;
					this.creep.memory.moveAttempt = undefined;
					this.creep.say("Lost. " + distance.toString());
					return (retry) ? this.creep.moveTo(pos) : this.moveTo(pfg, true);
				}
			}
		} catch (e) {
			console.log(e.message, target, "creepAction.moveTo");
			// fall back to regular move.
			if (!(target instanceof RoomPosition)) {
				target = new RoomPosition(target[0].pos.x, target[0].pos.y, target[0].pos.roomName);
			}
			this.creep.moveTo(<RoomPosition> target, {reusePath: 25});
		}
	}

	public getMineralTypeFromStore(source: StorageStructure | Creep): string {
		let resource: string = RESOURCE_ENERGY;
		const s: any = (source instanceof Creep) ? source.carry : source.store;
		_.reduce(s, function(result, value, key) {
			if (_.isNumber(value) && value > result) {
				result = value;
				resource = key;
			}
			return result;
		}, 0);
		return resource;
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
	public deserializePathFinderPosition(pFP: any): RoomPosition {
		if (_.isNumber(pFP)) {
			const rcp = global.reverseCantorPair(<number> pFP);
			return new RoomPosition(rcp[0], rcp[1], this.creep.room.name);
		} else {
			return new RoomPosition(pFP.x, pFP.y, pFP.roomName);
		}
	};
	public deserializeCantorPathArray(arr: number[]): RoomPosition[] {
		let path: RoomPosition[] = [];
		arr.forEach((n: number) => {
			const rcp = global.reverseCantorPair(n);
			path.push(new RoomPosition(rcp[0], rcp[1], this.creep.room.name));
		});
		return path;
	}
	public deserializePathFinderPath(pathFinderArray: Array<any>): RoomPosition[] {
		let path: RoomPosition[] = [];
		_.each(pathFinderArray, function (x) {
			path.push(new RoomPosition(x.x, x.y, x.roomName));
		}, this);
		return path;
	};

	public findPathFinderPath(
		goal: PathFinderGoal,
		ignoreCreeps: boolean = false,
		ignoreRoomConfig: boolean = false,
		startPos: RoomPosition = this.creep.pos,
		plainCost: number = 3,
		swampCost: number = 10,
	): RoomPosition[] {
		let callback = (ignoreCreeps) ? this.roomCallback : this.creepCallback;
		if (ignoreRoomConfig) {
			callback = this.ignoreCallback;
		}
		const maxOps = 4000;
/*		if (Game.cpu.bucket < global.BUCKET_MIN) {
			maxOps = 1000;
		}
		if (Game.cpu.bucket < (global.BUCKET_MIN / 2)) {
			maxOps = 500;
		}*/

/*		const moveParts = this.creep.getActiveBodyparts(MOVE);
		const totalParts = this.creep.body.length;

		// If we have a 1:1 ratio on MOVE parts, ignore roads.
		if ((totalParts / moveParts) <= 2) {
			plainCost = 1;
			swampCost = 5;
		}*/
		const path = PathFinder.search(startPos, goal, {
			// We need to set the defaults costs higher so that we
			// can set the road cost lower in `roomCallback`
			maxOps: maxOps,
			plainCost: plainCost,
			swampCost: swampCost,
			roomCallback: callback,
		});
		if (path.path.length < 1) {
			// We're near the target.
			return undefined;
		} else {
			if (path.ops > 500 || path.cost > 150 || path.incomplete) {
				console.log(global.colorWrap("PathFinder", "Red"), this.creep.memory.role, this.creep.room.name, goal[0].pos.roomName,
					`${maxOps} maxOps, ${path.ops} ops, ${path.cost} cost, ${path.incomplete} incomplete`
				);
			}
			return path.path;
		}
	};

	public safeLook(lookFor: string, pos: RoomPosition, range: number = 1): LookAtResultWithPos[] {
		const positions: any = {
			top: pos.y - range,
			left: pos.x - range,
			bottom: pos.y + range,
			right: pos.x + range,
		};
		_.forOwn(positions, (val: number, key: any) => {
			if (val < 1) {
				positions[key] = 1;
			}
			if (val > 48) {
				positions[key] = 48;
			}
		});
		return this.creep.room.lookForAtArea(lookFor, positions.top, positions.left, positions.bottom, positions.right, true) as LookAtResultWithPos[];
	}

	public pickupResourcesInRange(skipContainers: boolean = false): void {
		if (!this.creep.bagFull) {
			const targets = this.safeLook(LOOK_RESOURCES, this.creep.pos, 1);
			if (targets.length > 0) {
				this.creep.pickup(targets[0].resource);
			} else if (!skipContainers) {
				if (!this.creep.bagFull) {
					const containers = this.creep.room.containers.filter((s: StructureContainer) => s.structureType === STRUCTURE_CONTAINER
						&& s.store.energy > 0
						&& s.pos.isNearTo(this.creep.pos)
					);
					if (containers.length > 0) {
						this.creep.withdraw(containers[0], RESOURCE_ENERGY);
					}
				}
			}
		}
	};

	public expireCreep(): boolean {
		// see if an upgrade for this creep is available
		if (!!this.creep.memory.homeRoom) {
			try {
				const x: number = this.governor.getNumberOfCreepsInRole();
				if (x > this.governor.getCreepLimit()) {
					return true;
				}
				const body = this.governor.getBody();
				if (CreepGovernor.calculateRequiredEnergy(body)
					> CreepGovernor.calculateRequiredEnergy(_.pluck(this.creep.body, "type"))) {
					return true;
				}
			} catch (e) {
				console.log(`creepAction.ExpireCreep: ${e.message}`);
				return false;
			}
		}
		return false;
	};
	public renewCreep(max: number = global.MAX_TTL): boolean {
		if (!!this.creep.memory.isBoosted) {
			return true;
		}
		if (!_.isBoolean(this.creep.memory.hasRenewed)) {
			this.creep.memory.hasRenewed = true;
		}
		if (this.creep.ticksToLive < 250) {
			this.creep.memory.hasRenewed = false;
		}
		if (this.creep.ticksToLive > max) {
			this.creep.memory.hasRenewed = true;
			delete this.creep.memory.renewStation;
		}
		if (this.creep.memory.hasRenewed === true) {
			return true;
		}
		if (!this.checkCpu()) {
			return false;
		}
		const homeRoom = Game.rooms[this.creep.memory.homeRoom];
		if (!homeRoom) {
			return true;
		}
		if (this.creep.memory.hasRenewed === false && this.creep.ticksToLive > 350
			&& (
				homeRoom.energyAvailable < 300
				|| ((homeRoom.energyInContainers + homeRoom.energyAvailable) < homeRoom.energyCapacityAvailable)
			)
		) {
			this.creep.memory.hasRenewed = true;
			delete this.creep.memory.renewStation;
			return true;
		}
		if (this.creep.memory.hasRenewed !== undefined && this.creep.memory.hasRenewed === false) {
			let renewStation: StructureSpawn;
			if (!this.creep.memory.renewStation) {
					renewStation = homeRoom.getFreeSpawn();
					this.creep.memory.renewStation = renewStation.id;
			} else {
				renewStation = Game.getObjectById<StructureSpawn>(this.creep.memory.renewStation);
			}
			if (!this.creep.pos.isNearTo(renewStation)) {
				this.moveTo(renewStation.pos);
			} else {
				if (this.expireCreep()) {
					renewStation.recycleCreep(this.creep);
				} else {
					if (this.creep.carry.energy > 0 && renewStation.energy < renewStation.energyCapacity * 0.5) {
						this.creep.transfer(renewStation, RESOURCE_ENERGY);
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
					&& !!structure.store && structure.store[RESOURCE_ENERGY] > (this.creep.carryCapacity - this.creep.carrySum)) // containers and storage
					|| (structure instanceof StructureLink && !!structure.energy && structure.energy >= (this.creep.carryCapacity - this.creep.carrySum)) // links
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
			const source: Structure | Source = Game.getObjectById(this.creep.memory.source) as Structure | Source;
			if (source instanceof Structure) { // Sources aren't structures
				if (!this.creep.pos.isNearTo(source)) {
					this.moveTo(source.pos);
				} else {
					const drops = source.pos.lookFor(LOOK_RESOURCES);
					if (drops.length > 0) {
						_.forEach(drops, (drop: Resource) => {
							this.creep.pickup(drop);
						});
					} else {
						const status = this.creep.withdraw(source, RESOURCE_ENERGY);
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
								console.log(`Unhandled ERR in creep.source.container ${status}`);
						}
					}
				}
			} else {
				if (!this.creep.pos.isNearTo(source)) {
					this.moveTo(source.pos);
				} else {
					const status = this.creep.harvest(source);
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
							console.log(`Unhandled ERR in creep.source.harvest: ${status}`);
					}
				}
			}
		}
	}

	public getBoosted(): boolean {
		if (!this.checkCpu()) {
			return false;
		}
		if (this.boosts.length < 1) {
			return true;
		}
		const todo: string[] = _.difference(this.boosts, this.hasBoosts);
		if (todo.length < 1) {
			return true;
		}
		const boost = todo.shift();
		// find a lab that supplies this resource
		const lab = this.creep.room.boostLabs.filter((l: StructureLab) => l.mineralType === boost && l.mineralAmount >= 30).shift();
		if (!!lab) {

			// move to it
			if (!this.creep.pos.isNearTo(lab)) {
				this.moveTo(lab.pos);
				return false;
			} else {
				this.creep.say(boost);
				// boost it
				try {
					const status = lab.boostCreep(this.creep);
					if (status === OK || status === ERR_NOT_ENOUGH_RESOURCES || status === ERR_NOT_FOUND) {
						// mark it as done.
						this.creep.say("F\u00C6\u00C6LG\u00D8\u00D8\u00D0!", true);
						this.creep.memory.hasBoosts.push(boost);
						this.creep.memory.isBoosted = true; // prevent renew while passing spawns.
					} else {
						this.creep.say(status.toString());
					}
				} catch (e) {
					console.log(e.message);
				}
			}
			return false;
		}
		// Forget about this boost and continue with the next, if any
		this.creep.memory.hasBoosts.push(boost);
		return true;
	}

	public moveToTargetRoom(): void {
		const flag = Game.flags[this.creep.memory.config.targetRoom];
		if (!!flag && !!flag.pos) {
			this.moveTo(flag.pos);
			return;
		}
		console.log("NON FLAG MOVE");
		if (!this.creep.memory.exit || !this.creep.memory.exitRoom || this.creep.memory.exitRoom === this.creep.room.name ) {
			let index: number = 0;
			_.each(this.creep.memory.config.route, function(route: findRouteRoute, idx: number) {
				if (route.room === this.creep.room.name) {
					index = idx + 1;
				}
			}, this);
			const route = this.creep.memory.config.route[index];
			console.log(`finding route to ${route.exit} in ${route.room}`);
			this.creep.memory.exit = this.creep.pos.findClosestByPath(route.exit, {
				costCallback: this.roomCallback,
			});
			this.creep.memory.exitRoom = route.room;
		} else {
			if (!!this.creep.memory.exit) {
				this.moveTo(this.creep.memory.exit);
			}
		}
	}

	public action(startCpu: number): boolean {
		this.startCpu = startCpu;
		this.pickupResourcesInRange();
		if (this.checkCpu()) {
			return this.renewCreep();
		} else {
			return false;
		}
	}

	protected checkCpu(): boolean {
		const cpuUsage = _.round(Game.cpu.getUsed() - this.startCpu, 2);
		const overCpuLimit = (cpuUsage > 3);
		if (overCpuLimit) {
			console.log(global.colorWrap("CPU WARNING", "Red"), this.creep.name, this.creep.room.name, this.creep.memory.role, cpuUsage);
		}
		return (overCpuLimit) ? false : true;
	}
}
