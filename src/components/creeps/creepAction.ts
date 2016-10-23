export interface ICreepAction {
	creep: Creep;
	renewStation: Spawn;
	fleeRange: number;
	boosts: string[];
	hasBoosts: string[];

	setCreep(creep: Creep): void;
	/**
	 * Wrapper for Creep.moveTo() method.
	 */
	moveTo(target: RoomPosition|PathFinderGoal): string | number;
	flee(): boolean;

	action(): boolean;

	createPathFinderMap(goals: RoomPosition[]|RoomPosition, range: number): PathFinderGoal;
	deserializePathFinderPath(pathFinderArray: Array<any>): RoomPosition[];
	findPathFinderPath(goal: PathFinderGoal): RoomPosition[] | boolean;
	moveToTargetRoom(): void;
	dumpToCloseTarget(): boolean;
}
let allowedRooms: string[] = undefined;

export default class CreepAction implements ICreepAction {
	public static MINRCL: number = global.MINRCL_CREEP;
	public static PRIORITY: number = global.PRIORITY_CREEP;
	public static ROLE: string = "Creep";
	public static maxCreeps: number = 0;
	public static bodyPart: string[] = [WORK, MOVE, CARRY, MOVE];
	public static maxParts: number = -1;

	public static getCreepConfig(room: Room): CreepConfiguration {
		return {body: [], name: "", properties: {role: null, homeRoom: null}};
	}

	public static getCreepLimit(room: Room): number {
		return this.maxCreeps;
	}

	public static getNumberOfCreepsInRole(room: Room): number {
		return this.getCreepsInRole(room).length;
	}

	public static getCreepsInRole(room: Room): Creep[] {
		return _.get(global.tickCache.rolesByRoom, `${this.ROLE}.${room.name}`, []);
	}

	public static getBody(room: Room) {
		const numParts = global.clamp(_.floor(room.energyCapacityAvailable / global.calculateRequiredEnergy(this.bodyPart)), 1, this.maxParts);
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return global.sortBodyParts(body);
	}

	public creep: Creep;
	public renewStation: Spawn;
	public readonly fleeRange: number = 5;
	public boosts: string[] = [];
	public hasBoosts: string[] = [];

	public setCreep(creep: Creep): void {
		this.creep = creep;
		if (!this.creep.memory.hasBoosts) {
			this.creep.memory.hasBoosts = [];
		}
		this.hasBoosts = this.creep.memory.hasBoosts;
	}

	public roomCallback = function (roomName: string): CostMatrix | boolean {
		try {
			if (_.includes(global.ROOM_BLACKLIST, roomName)) {
				return false;
			}
			if (!!allowedRooms && !_.includes(allowedRooms, roomName)) {
				return false;
			}
			const room = Game.rooms[roomName];
			if (!!room) {
				return room.getCostMatrix(false); // The cached one without per-tick creeps.
			} else if (!!Memory.matrixCache[roomName] && !!Memory.matrixCache[roomName].m) {
				let costMatrix = new PathFinder.CostMatrix();
				for (let i = 0; i < Memory.matrixCache[roomName].m[0].length; i++) {
					let pos = global.decodeCoordinate(Memory.matrixCache[roomName].m[0], i);
					costMatrix.set(pos.x, pos.y, 0xff);
				}
				for (let i = 0; i < Memory.matrixCache[roomName].m[1].length; i++) {
					let pos = global.decodeCoordinate(Memory.matrixCache[roomName].m[1], i);
					costMatrix.set(pos.x, pos.y, 1);
				}
				return costMatrix;
			} else {
				return new PathFinder.CostMatrix();
			}
		} catch (e) {
			console.log("creepAction.roomCallback", roomName, e.stack);
			return new PathFinder.CostMatrix();
		}
	};
	public creepCallback = function (roomName: string): CostMatrix | boolean {
		try {
			if (_.includes(global.ROOM_BLACKLIST, roomName)) {
				return false;
			}
			if (!!allowedRooms && !_.includes(allowedRooms, roomName)) {
				return false;
			}
			const room = Game.rooms[roomName];
			if (!!room) {
				return room.getCreepMatrix(); // Uncached, with per-tick creep updates.
			} else if (!!Memory.matrixCache[roomName] && !!Memory.matrixCache[roomName].m) {
				let costMatrix = new PathFinder.CostMatrix();
				for (let i = 0; i < Memory.matrixCache[roomName].m[0].length; i++) {
					let pos = global.decodeCoordinate(Memory.matrixCache[roomName].m[0], i);
					costMatrix.set(pos.x, pos.y, 0xff);
				}
				for (let i = 0; i < Memory.matrixCache[roomName].m[1].length; i++) {
					let pos = global.decodeCoordinate(Memory.matrixCache[roomName].m[1], i);
					costMatrix.set(pos.x, pos.y, 1);
				}
				return costMatrix;
			} else {
				return new PathFinder.CostMatrix();
			}
		} catch (e) {
			console.log("creepAction.creepCallback", roomName, e.stack);
			return new PathFinder.CostMatrix();
		}
	};
	public ignoreCallback = function (roomName: string): CostMatrix | boolean {
		try {
			if (_.includes(global.ROOM_BLACKLIST, roomName)) {
				return false;
			}
			if (!!allowedRooms && !_.includes(allowedRooms, roomName)) {
				return false;
			}
			const room = Game.rooms[roomName];
			if (!!room) {
				return room.getCostMatrix(true); // The cached one without per-tick creeps.
			} else if (!!Memory.matrixCache[roomName] && !!Memory.matrixCache[roomName].m) {
				let costMatrix = new PathFinder.CostMatrix();
				for (let i = 0; i < Memory.matrixCache[roomName].m[0].length; i++) {
					let pos = global.decodeCoordinate(Memory.matrixCache[roomName].m[0], i);
					costMatrix.set(pos.x, pos.y, 0xff);
				}
				for (let i = 0; i < Memory.matrixCache[roomName].m[1].length; i++) {
					let pos = global.decodeCoordinate(Memory.matrixCache[roomName].m[1], i);
					costMatrix.set(pos.x, pos.y, 1);
				}
				return costMatrix;
			} else {
				return new PathFinder.CostMatrix();
			}
		} catch (e) {
			console.log("creepAction.ignoreCallback", roomName, e.stack);
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

	public stringifyPathFinderPath(pfgPath: RoomPosition[]): string {
		let pathString: string = "";
		pfgPath.forEach((r: RoomPosition) => {
			pathString = pathString.concat(global.coordinateToCharacter(r));
		});
		return pathString;
	}
	public roomPositionFromString(s: string): RoomPosition {
		let p = global.decodeCoordinate(s, 0);
		let rp = new RoomPosition(p.x, p.y, this.creep.room.name);
		return rp;
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

	public getRouteCache(from: Structure | Source, to: Structure | Source): string {
		let route: string;
		if (!!Memory.pathCache[from.id] && !!Memory.pathCache[from.id][to.id]) {
			route = Memory.pathCache[from.id][to.id];
		} else if (!!Memory.pathCache[to.id] && !!Memory.pathCache[to.id][from.id]) {
			route = global.revStr(Memory.pathCache[to.id][from.id]);
		} else {
			const path = this.findPathFinderPath(this.createPathFinderMap(<RoomPosition> to.pos), true, false, from.pos, 10, 20);
			if (!!path && path.length > 0) {
				route = this.stringifyPathFinderPath(path);
				if (!!Memory.pathCache[from.id]) {
					Memory.pathCache[from.id][to.id] = route;
				} else if (!!Memory.pathCache[to.id]) {
					Memory.pathCache[to.id][from.id] = global.revStr(route);
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
		if (!!this.creep.memory.pfg && _.isString(this.creep.memory.ps) && this.creep.memory.ps.length > 0 && this.comparePfg(pfg, this.creep.memory.pfg)) {
			return this.moveTo(pfg);
		} else {
			let route = this.getRouteCache(from, to);
			if (!!route) {
				this.creep.memory.ps = route;
				this.creep.memory.pfg = pfg;
				return this.moveTo(pfg);
			} else {
				this.creep.memory.ps = undefined;
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
			let pathString: string = "";
			if (!!this.creep.memory.pfg
				&& _.isString(this.creep.memory.ps)
				&& this.creep.memory.ps.length > 0
				&& this.comparePfg(pfg, this.creep.memory.pfg)
			) {
				pathString = this.creep.memory.ps;
				if (pathString.length < 1) {
					this.creep.memory.ps = undefined;
					this.creep.memory.pfg = undefined;
					this.creep.memory.lp = undefined;
					return ERR_NOT_FOUND;
				}
			} else {
				this.creep.memory.lp = undefined;
				let ignoreCreeps = !retry;
				if (this.creep.pos.getRangeTo(pfg[0].pos) < 3) {
					ignoreCreeps = false;
				}
				const pfPath = this.findPathFinderPath(pfg, ignoreCreeps);
				if (!!pfPath && pfPath.length > 0) {
					this.creep.memory.pfg = pfg;
					pathString = this.stringifyPathFinderPath(pfPath);
				} else {
					this.creep.memory.ps = undefined;
					return ERR_NOT_FOUND;
				}
			}
			if (!!this.creep.memory.lp) {
				const lp: RoomPosition = this.roomPositionFromString(this.creep.memory.lp);
				if (this.creep.pos.isEqualTo(lp)) {
					this.creep.memory.st = (!!this.creep.memory.st) ? this.creep.memory.st + 1 : 1;
					if (this.creep.memory.st > 1) {
						this.creep.memory.st = undefined;
						this.creep.memory.lp = undefined;
						this.creep.memory.ps = undefined;
						this.creep.memory.ma = undefined;
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
						if (!!this.creep.memory.ma) {
							pathString = this.creep.memory.ma + pathString;
						}
					}
				} else {
					delete this.creep.memory.st;
				}
			}

			let pos: RoomPosition = this.roomPositionFromString(pathString);
			while (this.creep.pos.isEqualTo(pos)) {
				if (pathString.length > 0) {
					pos = this.roomPositionFromString(pathString);
					pathString = pathString.slice(1);
				} else {
					this.creep.memory.ps = undefined;
					this.creep.memory.pfg = undefined;
					this.creep.memory.lp = undefined;
					this.creep.memory.ma = undefined;
					return ERR_NOT_FOUND;
				}
			}
			if (this.creep.pos.isNearTo(pos)) {
				this.creep.memory.lp = global.coordinateToCharacter(this.creep.pos);
				this.creep.memory.ps = pathString;
				this.creep.memory.ma = global.coordinateToCharacter(pos);

				return this.creep.move(this.creep.pos.getDirectionTo(pos));
			} else {
				this.creep.memory.lp = undefined;
				const distance = this.creep.pos.getRangeTo(pos);
				if (distance === 2) {
					this.creep.say("Catchup");
					return this.creep.moveTo(pos);
				} else {
					this.creep.memory.st = undefined;
					this.creep.memory.ps = undefined;
					this.creep.memory.lp = undefined;
					this.creep.memory.ma = undefined;
					this.creep.say("Lost. " + distance.toString());
					return (retry) ? this.creep.moveTo(pos) : this.moveTo(pfg, true);
				}
			}
		} catch (e) {
			console.log("creepAction.moveTo", target, e.stack);
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

	public createPathFinderMap(goals: RoomPosition[]|RoomPosition, range: number = 1): PathFinderGoal {
		let goalsList: RoomPosition[];
		if (!_.isArray(goals)) {
			goalsList = [<RoomPosition> goals];
		} else {
			goalsList = goals as RoomPosition[];
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

	public findPathFinderPath(
		goal: PathFinderGoal,
		ignoreCreeps: boolean = false,
		ignoreRoomConfig: boolean = false,
		startPos: RoomPosition = this.creep.pos,
		plainCost: number = 2,
		swampCost: number = 12,
	): RoomPosition[] {
		let callback = (ignoreCreeps) ? this.roomCallback : this.creepCallback;
		if (ignoreRoomConfig) {
			callback = this.ignoreCallback;
		}
		allowedRooms = [startPos.roomName];
		if (startPos.roomName !== goal[0].pos.roomName) {
			_.forEach(Game.map.findRoute(startPos.roomName, goal[0].pos.roomName, {
				routeCallback(roomName) {
					const parsed: any = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
					const isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
					const isMyRoom = Game.rooms[roomName] &&
						Game.rooms[roomName].controller &&
						Game.rooms[roomName].controller.my;
					const isAlliedRoom = !!Memory.matrixCache[roomName] && !!Memory.matrixCache[roomName].a;
					const isHostileRoom = !!Memory.matrixCache[roomName] && !!Memory.matrixCache[roomName].h;
					if (isHighway || isMyRoom) {
						return 1;
					} else if (isAlliedRoom) {
						return 3;
					} else if (isHostileRoom) {
						return 5;
					} else {
						return 2.5;
					}
				},
			}), (info) => {
				allowedRooms.push(info.room);
			});
		}
		const maxOps = allowedRooms.length * 2000;
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
		allowedRooms = undefined;
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

	public expireCreep(): boolean {
		// see if an upgrade for this creep is available
		if (!!this.creep.memory.homeRoom) {
			try {
				const x: number = CreepAction.getNumberOfCreepsInRole(this.creep.room);
				if (x > CreepAction.getCreepLimit(this.creep.room)) {
					return true;
				}
				const body = CreepAction.getBody(this.creep.room);
				if (global.calculateRequiredEnergy(body) > global.calculateRequiredEnergy(_.pluck(this.creep.body, "type"))) {
					return true;
				}
			} catch (e) {
				console.log(`creepAction.ExpireCreep`, e.stack);
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
						this.creep.logTransfer(renewStation, RESOURCE_ENERGY);
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
			const storageStructures = _.union(
				this.creep.room.groupedStructures[STRUCTURE_CONTAINER],
				this.creep.room.groupedStructures[STRUCTURE_STORAGE],
				this.creep.room.groupedStructures[STRUCTURE_LINK],
			);
			let source: Structure | Source = this.creep.pos.findClosestByPath(storageStructures, {
				filter: (structure: StorageStructure | StructureLink) => ((structure instanceof StructureContainer || structure instanceof StructureStorage)
					&& !!structure.store && structure.store[RESOURCE_ENERGY] > (this.creep.carryCapacity - this.creep.carrySum)) // containers and storage
					|| (structure instanceof StructureLink && !!structure.energy && structure.energy >= (this.creep.carryCapacity - this.creep.carrySum)), // links
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
					console.log("getBoosted", e.stack);
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

	public action(): boolean {
		this.creep.pickupResourcesInRange();
		return this.renewCreep();
	}

	public dumpToCloseTarget(additionalStructures: string[] = []): boolean {
		// if in a base room and holding energy
		if (!!this.creep.room.storage
			&& !!this.creep.room.storage.my
			&& this.creep.carry[RESOURCE_ENERGY] > 0
			&& !_.get(global, `tickCache.creeps.${this.creep.id}.transfered`, false)
		) {
			// get first adjacent structure needing energy
			let needyTypes: string[] = [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_LAB, STRUCTURE_TOWER];
			needyTypes = _.union(needyTypes, additionalStructures);
			const lookTargets = this.creep.safeLook(LOOK_STRUCTURES, 1);
			const targets = _.map(lookTargets, "structure") as EnergyStructure[];
			const needyStructure = _.find(targets, (s: EnergyStructure) =>
				needyTypes.indexOf(s.structureType) > -1
				&& ((!!s.energyCapacity && s.energy < s.energyCapacity) || (
						(s instanceof StructureStorage || s instanceof StructureTerminal || s instanceof StructureContainer)
						&& (_.sum(s.store) + this.creep.carry.energy) <= s.storeCapacity
					)
				)
			);
			if (needyStructure) {
				if (needyStructure.structureType === STRUCTURE_STORAGE || needyStructure.structureType === STRUCTURE_TERMINAL) {
					this.creep.logTransfer(needyStructure, this.getMineralTypeFromStore(this.creep));
				} else {
					this.creep.logTransfer(needyStructure, RESOURCE_ENERGY);
				}
				return true;
			}
		}
		return false;
	}
	public withdrawFromCloseTarget(additionalStructures: string[] = []): boolean {
		if (this.creep.carrySum < this.creep.carryCapacity) {
			let providerTypes: string[] = [STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_CONTAINER];
			providerTypes = _.union(providerTypes, additionalStructures);
			const target = _(this.creep.safeLook(LOOK_STRUCTURES, 1)).map("structure").find((s: StorageStructure) =>
				providerTypes.indexOf(s.structureType) > -1 && _.sum(s.store) > 0) as StorageStructure;
			if (!!target) {
				this.creep.withdraw(target, this.getMineralTypeFromStore(target));
				return true;
			}
		}
		return false;
	}
}
