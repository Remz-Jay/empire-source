export let username: string;

export function init() {
	if (Memory.stats === undefined) {
		Memory.stats = {};
	}
	username = _.get(
		_.find(Game.structures, (s) => true), "owner.username",
		_.get(_.find(Game.creeps, (s) => true), "owner.username")
	) as string;
	clean();
}
export function clean() {
	Memory.stats = {};
}

export function getStats(json: boolean): string|Object {
	if (json) {
		return JSON.stringify(Memory.stats);
	} else {
		return Memory.stats;
	}
}

export function addStat(key: string, value: string|Object): void {
	Memory.stats[key] = value;
}

export function flattenObject(ob: any): any {
	let toReturn: any = {};

	for (let i in ob) {
		if (!ob.hasOwnProperty(i)) {
			continue;
		}

		if ((typeof ob[i]) === "object") {
			let flatObject = this.flattenObject(ob[i]);
			for (let x in flatObject) {
				if (!flatObject.hasOwnProperty(x)) {
					continue;
				}

				toReturn[i + "." + x] = flatObject[x];
			}
		} else {
			toReturn[i] = ob[i];
		}
	}
	return toReturn;
}

export function runBuiltinStats(runExpensive: boolean = false) {

	clean();
	let stats: StatsObject = {
		time: new Date().toISOString(),
		tick: Game.time,
		cpu: {
			limit: Game.cpu.limit,
			tickLimit: Game.cpu.tickLimit,
			bucket: Game.cpu.bucket,
		},
		gcl: {
			level: Game.gcl.level,
			progress: Game.gcl.progress,
			progressTotal: Game.gcl.progressTotal,
		},
		rooms: undefined,
		reservedRoom: undefined,
		terminal: undefined,
		spawns: undefined,
		room: undefined,
		sources: undefined,
		minerals: undefined,
	};

	_.defaults(stats, {
		rooms: {},
		reservedRoom: {},
	});

	_.forEach(Game.rooms, (room) => {

		if (_.isEmpty(room.controller)) {
			return;
		}
		let controller = room.controller;

		// Is hostile room? Continue
		if (!controller.my && !!controller.reservation && controller.reservation.username === this.username) {
			// Reserved room
			if (!stats.rooms[room.name]) {
				stats.rooms[room.name] = {};
			}
			_.merge(stats.rooms[room.name], {
				myRoom: 0,
				level: controller.level,
				reservation: _.get(controller, "reservation.ticksToEnd"),
				energy: 0,
				energyCapacity: 0,
				mineralAmount: 0,
				mineralType: "",
			});
			if (runExpensive) {
				this.roomExpensive(stats, room);
			}
		} else {
			// this is my room. Put it in rooms.
			if (!stats.rooms[room.name]) {
				stats.rooms[room.name] = {};
			}
			// Controller
			_.merge(stats.rooms[room.name], {
				myRoom: 1,
				level: controller.level,
				controllerProgress: controller.progress,
				controllerProgressTotal: room.controller.progressTotal,
				upgradeBlocked: controller.upgradeBlocked,
				ticksToDowngrade: controller.ticksToDowngrade,
				energy: 0,
				storedEnergy: 0,
				energyCapacity: 0,
				mineralAmount: 0,
				mineralType: "",
			});

			if (controller.level > 0) {

				// Room
				_.merge(stats.rooms[room.name], {
					energyAvailable: room.energyAvailable,
					energyCapacityAvailable: room.energyCapacityAvailable,
				});

				// Storage
				if (room.storage) {
					_.defaults(stats.rooms[room.name], {
						storage: {},
					});
					stats.rooms[room.name].storage = {
						store: _.sum(room.storage.store),
						resources: {},
						id: room.storage.id,
					};
					for (let resourceType in room.storage.store) {
						if (room.storage.store.hasOwnProperty(resourceType)) {
							stats.rooms[room.name].storage.resources[resourceType] = room.storage.store[resourceType];
							stats.rooms[room.name].storage[resourceType] = room.storage.store[resourceType];
							if (resourceType === RESOURCE_ENERGY) {
								stats.rooms[room.name].storedEnergy += room.storage.store[resourceType];
							}
						}
					}
				}

				// Terminals
				if (room.terminal) {
					_.defaults(stats, {
						terminal: {},
					});
					stats.terminal[room.terminal.id] = {
						room: room.name,
						store: _.sum(room.terminal.store),
						resources: {},
					};
					for (let resourceType in room.terminal.store) {
						if (room.terminal.store.hasOwnProperty(resourceType)) {
							stats.terminal[room.terminal.id].resources[resourceType] = room.terminal.store[resourceType];
							stats.terminal[room.terminal.id][resourceType] = room.terminal.store[resourceType];
						}
					}
				}
			}
			if (runExpensive) {
				this.roomExpensive(stats, room);
			}
		}
	});

	// Spawns
	_.defaults(stats, {
		spawns: {},
	});
	_.forEach(Game.spawns, function (spawn) {
		stats.spawns[spawn.name] = {
			room: spawn.room.name,
			busy: !!spawn.spawning,
			remainingTime: _.get(spawn, "spawning.remainingTime", 0),
		};
	});
	stats.room = stats.rooms;
	delete stats.rooms;
	for (let key in stats.room) {
		if (!stats.room.hasOwnProperty(key)) {
			continue;
		}
		let r = stats.room[key];
		if (r.myRoom === 0) {
			if (!stats.reservedRoom[key]) {
				stats.reservedRoom[key] = {};
			}
			stats.reservedRoom[key] = r;
			delete stats.room[key];
		}
	}
	Memory.stats = this.flattenObject(stats);
}

export function roomExpensive(stats: StatsObject, room: Room) {

	// Source Mining
	_.defaults(stats, {
		sources: {},
		minerals: {},
	});

	stats.rooms[room.name].sources = {};
	let sources = room.sources;

	_.forEach(sources, (source: Source) => {
		stats.sources[source.id] = {
			room: room.name,
			energy: source.energy,
			energyCapacity: source.energyCapacity,
			ticksToRegeneration: source.ticksToRegeneration,
		};
		if (source.energy < source.energyCapacity && source.ticksToRegeneration) {
			let energyHarvested = source.energyCapacity - source.energy;
			if (source.ticksToRegeneration < ENERGY_REGEN_TIME) {
				let ticksHarvested = ENERGY_REGEN_TIME - source.ticksToRegeneration;
				stats.sources[source.id].averageHarvest = energyHarvested / ticksHarvested;
			}
		} else {
			stats.sources[source.id].averageHarvest = 0;
		}
		stats.rooms[room.name].energy += source.energy;
		stats.rooms[room.name].energyCapacity += source.energyCapacity;
	});

	// Mineral Mining
	let minerals = room.minerals;
	stats.rooms[room.name].minerals = {};
	_.forEach(minerals, (mineral: Mineral) => {
		stats.minerals[mineral.id] = {
			room: room.name,
			mineralType: mineral.mineralType,
			mineralAmount: mineral.mineralAmount,
			ticksToRegeneration: mineral.ticksToRegeneration,
		};
		stats.rooms[room.name].mineralAmount += mineral.mineralAmount;
		stats.rooms[room.name].mineralType += mineral.mineralType;
	});

	// Hostiles in Room
	let hostiles = room.hostileCreeps;
	stats.rooms[room.name].hostiles = {};
	_.forEach(hostiles, (hostile: Creep) => {
		if (!stats.rooms[room.name].hostiles[hostile.owner.username]) {
			stats.rooms[room.name].hostiles[hostile.owner.username] = 1;
		} else {
			stats.rooms[room.name].hostiles[hostile.owner.username]++;
		}
	});

	// My Creeps
	stats.rooms[room.name].creeps = room.myCreeps.length;
}
