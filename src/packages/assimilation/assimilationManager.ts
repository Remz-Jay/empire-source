import * as SourceManager from "../../components/sources/sourceManager";

import Claim from "./roles/claim";
import ASMBuilder from "./roles/builder";
import ASMHarvester from "./roles/harvester";
import ASMMule from "./roles/mule";
import Terminator from "../warfare/roles/terminator";
import Bully from "../warfare/roles/bully";
import Sentinel from "../warfare/roles/sentinel";
/* import ASMRaider from "./roles/raider"; */

function initMemory(): void {
	if (!Memory.assimilation) {
		Memory.assimilation = {
			targets: [],
			config: {},
		};
	}
}

let config: RemoteRoomConfig;
let homeRoom: Room;
let targetRoom: Room;
let isSpawning: boolean;
let goHome: boolean;

export function setup() {
	initMemory();
	global.assman = {
		add(roomName: string, homeRoomName: string, claim: boolean = false, hasController = true, reserveOnly = false) {
			if (_.isNaN(Game.map.getRoomLinearDistance(roomName, homeRoomName))) {
				console.log(`ASM.add error. Invalid roomName for either ${roomName} or ${homeRoomName}.`);
				return;
			}
			Memory.assimilation.targets.push(roomName);
			getConfigForRemoteTarget(roomName, homeRoomName, claim, hasController, reserveOnly);
			console.log(`Added ${roomName} for assimilation.`);
		},
		remove(roomName: string) {
			Memory.assimilation.targets = _.pull(Memory.assimilation.targets, roomName);
			delete Memory.assimilation.config[roomName];
			console.log(`Removed ${roomName} from the assimilation targets.`);
		},
	};
}
function findRoute(fromRoom: string, toRoom: string): findRouteArray | number {
	return Game.map.findRoute(fromRoom, toRoom, {
		routeCallback(roomName) {
			const parsed: any = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
			const isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
			const isMyRoom = Game.rooms[roomName] &&
				Game.rooms[roomName].controller &&
				Game.rooms[roomName].controller.my;
			if (isHighway || isMyRoom) {
				return 1;
			} else {
				return 2.5;
			}
		},
	});
}
function getConfigForRemoteTarget(
		remoteRoomName: string,
		homeRoomName?: string,
		claim: boolean = false,
		hasController = true,
		reserveOnly = false
	): RemoteRoomConfig {
	if (!!Memory.assimilation.config[remoteRoomName]) {
		return Memory.assimilation.config[remoteRoomName];
	} else if (!!homeRoomName) {
		let distance: number = Infinity;
		let target: string = undefined;
		let optimalRoute: findRouteArray = undefined;
		const route = findRoute(homeRoomName, remoteRoomName);
		if (!_.isNumber(route) && route.length < distance) {
			distance = route.length;
			optimalRoute = route;
			target = homeRoomName;
		}
		const roomConfig: RemoteRoomConfig = {
			homeRoom: target,
			targetRoom: remoteRoomName,
			homeDistance: distance,
			route: optimalRoute,
			claim: claim,
			hasController: hasController,
			reserveOnly: reserveOnly,
		};
		Memory.assimilation.config[remoteRoomName] = roomConfig;
		return roomConfig;
	} else {
		console.log(`ASM.getConfigForRemoteTarget error: no homeRoomName supplied, but config is not yet present.`);
	}
}

function createCreep(creepConfig: CreepConfiguration, priority: boolean = false): string|number {
	const spawn: StructureSpawn = homeRoom.getFreeSpawn();
	let status: number | string = spawn.canCreateCreep(creepConfig.body, creepConfig.name);
	if (status === OK) {
		if (priority) {
			status = spawn.createCreep(creepConfig.body, creepConfig.name, creepConfig.properties);
		} else {
			status = spawn.createCreepWhenIdle(creepConfig.body, creepConfig.name, creepConfig.properties);
		}
		if (global.VERBOSE) {
			if (_.isNumber(status)) {
				console.log(`Unable to create ${creepConfig.properties.role} Creep (${status})`);
			} else {
				console.log(`Started creating new ${creepConfig.properties.role} Creep ${status}`);
			}
		}
	}
	return status;
}

function manageClaim(roomName: string, claim: boolean = false, reserveOnly = false) {
	const ctor = Claim;
	ctor.setConfig(config, claim, reserveOnly);
	const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ctor.ROLE],
		(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName
	);
	if (creepsInRole.length > 0) {
		const role: Claim = new ctor();
		_.each(creepsInRole, function (creep: Creep) {
			try {
				if (!creep.spawning) {
					role.setCreep(<Creep> creep);
					role.setGoHome(goHome);
					role.doClaim = claim;
					role.action();
				}
			} catch (e) {
				console.log("ERROR :: ", ctor.ROLE, creep.name, creep.room.name, e.message);
			}
		}, this);
	} else {
		if (
			(config.reserveOnly && (!config.controllerTTL || config.controllerTTL < 1000) && !isSpawning && !goHome)
			|| (!config.reserveOnly && (
				!Game.rooms[roomName]
				|| !Game.rooms[roomName].controller
				|| !Game.rooms[roomName].controller.reservation
				|| (Game.rooms[roomName].controller.reservation.ticksToEnd < 1000 && !isSpawning && !goHome)
			))
		) {
			isSpawning = true;
			createCreep(ctor.getCreepConfig(homeRoom), true);
		}
	}
}
function manageContainers(): StructureContainer[] {
	let allContainers: StructureContainer[] = [];
	_.each(SourceManager.sources, function(source: Source) {
		const containers = targetRoom.groupedStructures[STRUCTURE_CONTAINER].filter((s: Structure) => s.pos.isNearTo(source.pos)) as StructureContainer[];
		if (containers.length < 1) {
			// No containers yet. See if we're constructing one.
			const p = source.pos;
			const lookResults = source.room.lookForAtArea(LOOK_CONSTRUCTION_SITES, p.y - 1, p.x - 1, p.y + 1, p.x + 1, true) as LookAtResultWithPos[];
			let sites: ConstructionSite[] = [];
			if (lookResults.length > 0) {
				_.forEach(lookResults, (cs: LookAtResultWithPos) => {
					if (!!cs.constructionSite.my && cs.constructionSite.structureType === STRUCTURE_CONTAINER) {
						sites.push(cs.constructionSite);
					}
				});
			}
			if (sites.length < 1) {
				// Nope, prepare one.
				const slots = SourceManager.getMiningSlots(source);
				const slot = slots[0];
				targetRoom.createConstructionSite(slot.x, slot.y, STRUCTURE_CONTAINER);
			}
		} else {
			allContainers = allContainers.concat(containers[0]); // In case there's more containers per source, just use 1.
		}
	}, this);
	return allContainers;
}

function manageConstructions(maxBuilders: number = 1) {
	const sites = targetRoom.myConstructionSites;
	const ctor = ASMBuilder;
	ctor.setConfig(config);
	const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ctor.ROLE],
		(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
	if (creepsInRole.length > 0) {
		const role: ASMBuilder = new ctor();
		_.each(creepsInRole, function (creep: Creep) {
			try {
				if (!creep.spawning) {
					role.setCreep(<Creep> creep);
					role.setGoHome(goHome);
					role.action();
				}
			} catch (e) {
				console.log("ERROR :: ", ctor.ROLE, creep.name, creep.room.name, e.message);
			}
		}, this);
	}
	if (sites.length > 0) {
		// we need a builder
		if (creepsInRole.length < maxBuilders && !isSpawning && !goHome) {
			isSpawning = true;
			createCreep(ctor.getCreepConfig(homeRoom));
		}
	}
}

function manageHarvest(containers: StructureContainer[]) {
	if (containers.length > 0) {
		// we need harvesters
		const ctor = ASMHarvester;
		ctor.setConfig(config, containers);
		const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ctor.ROLE],
			(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
		if (creepsInRole.length > 0) {
			const role: ASMHarvester = new ctor();
			_.each(creepsInRole, function (creep: Creep) {
				try {
					if (!creep.spawning) {
						if (!creep.memory.container) {
							creep.memory.container = ctor.checkContainerAssignment();
						}
						role.setGoHome(goHome);
						role.setCreep(<Creep> creep);
						role.action();
						if (creep.ticksToLive < 100 && (creepsInRole.length === ctor.getCreepLimit(homeRoom)) && !isSpawning && !goHome) {
							// Do a preemptive spawn if this creep is about to expire.
							isSpawning = true;
							const status = createCreep(ctor.getCreepConfig(homeRoom));
							if (_.isNumber(status)) {
								console.log("manageHarvesters.preempt-spawn", global.translateErrorCode(status));
							} else {
								console.log("manageHarvesters.preempt-spawn", status);
							}
						}
					}
				} catch (e) {
					console.log("ERROR :: ", ctor.ROLE, creep.name, creep.room.name, e.message);
				}
			}, this);
		}
		if (creepsInRole.length < ctor.getCreepLimit(homeRoom) && !isSpawning && !goHome) {
			isSpawning = true;
			createCreep(ctor.getCreepConfig(homeRoom));
		}
	}
}

function manageDefenders(roomName: string, limit: number = 0) {
	const ctor = Sentinel;
	ctor.setConfig(config);
	const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ctor.ROLE],
		(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (creepsInRole.length > 0) {
		const role: Terminator = new ctor();
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				try {
					role.setCreep(<Creep> creep);
					role.action();
					if (creep.ticksToLive < 100 && (creepsInRole.length === limit) && !isSpawning) {
						// Do a preemptive spawn if this creep is about to expire.
						isSpawning = true;
						// TODO: might wanna remove the true here later
						const status = createCreep(ctor.getCreepConfig(homeRoom), true);
						if (_.isNumber(status)) {
							console.log("manageDefenders.preempt-spawn", global.translateErrorCode(status));
						} else {
							console.log("manageDefenders.preempt-spawn", status);
						}
					}
				} catch (e) {
					console.log("ERROR :: ", ctor.ROLE, creep.name, creep.room.name, e.message);
				}
			}
		}, this);
	}
	if (creepsInRole.length < limit && !isSpawning) {
		isSpawning = true;
		createCreep(ctor.getCreepConfig(homeRoom), true);
	}
}

function manageBullies(roomName: string, limit: number = 0) {
	const ctor = Bully;
	ctor.setConfig(config);
	const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ctor.ROLE],
		(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (!!creepsInRole && creepsInRole.length > 0) {
		const role: Bully = new ctor();
		_.each(creepsInRole, function (creep: Creep) {
			try {
				if (!creep.spawning) {
					role.setCreep(<Creep> creep);
					if (!config.hasController) {
						role.sourceKeeperDuty = true;
					}
					role.action();
					if (creep.ticksToLive < 200 && (creepsInRole.length === limit) && !isSpawning) {
						// Do a preemptive spawn if this creep is about to expire.
						isSpawning = true;
						// TODO: might wanna remove the true here later
						const status = createCreep(ctor.getCreepConfig(homeRoom), true);
						if (_.isNumber(status)) {
							console.log("manageBullies.preempt-spawn", global.translateErrorCode(status));
						} else {
							console.log("manageBullies.preempt-spawn", status);
						}
					}
				}
			} catch (e) {
				console.log("ERROR :: ", ctor.ROLE, creep.name, creep.room.name, e.message);
			}
		}, this);
	}
	if (!!creepsInRole && creepsInRole.length < limit && !isSpawning) {
		isSpawning = true;
		createCreep(ctor.getCreepConfig(homeRoom), true);
	}
}

function manageSourceKeepers(roomName: string, limit: number = 0) {
	if (!config.hasController) {
		manageBullies(roomName, limit);
		return;
	} else {
		const ctor = Terminator;
		ctor.setConfig(config);
		const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ctor.ROLE],
			(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
		if (creepsInRole.length > 0) {
			const role: Terminator = new Terminator();
			_.each(creepsInRole, function (creep: Creep) {
				try {
					if (!creep.spawning) {
						role.setCreep(<Creep> creep);
						if (!config.hasController) {
							role.sourceKeeperDuty = true;
						}
						role.action();
						if (creep.ticksToLive < 200 && (creepsInRole.length === limit) && !isSpawning) {
							// Do a preemptive spawn if this creep is about to expire.
							isSpawning = true;
							// TODO: might wanna remove the true here later
							const status = createCreep(ctor.getCreepConfig(homeRoom), true);
							if (_.isNumber(status)) {
								console.log("manageSourceKeepers.preempt-spawn", global.translateErrorCode(status));
							} else {
								console.log("manageSourceKeepers.preempt-spawn", status);
							}
						}
					}
				} catch (e) {
					console.log("ERROR :: ", ctor.ROLE, creep.name, creep.room.name, e.message);
				}
			}, this);
		}
		if (creepsInRole.length < limit && !isSpawning) {
			isSpawning = true;
			createCreep(ctor.getCreepConfig(homeRoom), true);
		}
	}
}

function manageMules(containers: StructureContainer[]) {
	if (containers.length > 0) {
		// we need mules
		const ctor = ASMMule;
		ctor.setConfig(config, containers);
		const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ctor.ROLE],
			(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
		if (creepsInRole.length > 0) {
			const role: ASMMule = new ctor();
			_.each(creepsInRole, function (creep: Creep) {
				try {
					if (!creep.spawning) {
						role.setCreep(<Creep> creep);
						role.setGoHome(goHome);
						role.action();
					}
				} catch (e) {
					console.log("ERROR :: ", ctor.ROLE, creep.name, creep.room.name, e.message);
				}
			}, this);
		}
		if (creepsInRole.length < ctor.getCreepLimit(homeRoom) && !isSpawning && !goHome) {
			isSpawning = true;
			createCreep(ctor.getCreepConfig(homeRoom));
		}
	}
}
export function govern(): void {
	_.each(Memory.assimilation.targets, (roomName: string) => {
		try {
			if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
				config = getConfigForRemoteTarget(roomName);
				config.hasController = _.get(config, "hasController", true);
				config.reserveOnly = _.get(config, "reserveOnly", false);
				homeRoom = Game.rooms[config.homeRoom];
				targetRoom = Game.rooms[roomName];
				isSpawning = false;
				goHome = false;
				if (config.hasController) {
					config.controllerTTL = _.get(config, "controllerTTL", 0);
				}

				// Only manage claim in rooms with a controller (not in SK rooms).
				if (config.hasController && (!targetRoom || !targetRoom.controller || targetRoom.controller.level < 1)) {
					try {
						manageClaim(roomName, config.claim, config.reserveOnly);
					} catch (e) {
						console.log(`ERROR :: ASM in room ${roomName}: [CLAIM] ${e.message}`);
					}
				}
				if (!!targetRoom && (!config.hasController || targetRoom.hostileCreeps.length > 0 || Game.cpu.bucket > (global.BUCKET_MIN / 2))) {
					if (config.hasController && targetRoom.hostileCreeps.length > 1) { // It makes no sense to check for hostiles in SK rooms.
						goHome = true;
						if (!targetRoom.memory.hostileAlarm || targetRoom.memory.hostileAlarm !== targetRoom.hostileCreeps.length) {
							Game.notify(`Warning: ${targetRoom.hostileCreeps.length} hostiles in ${targetRoom.name} from ${targetRoom.hostileCreeps[0].owner.username}`);
							targetRoom.memory.hostileAlarm = targetRoom.hostileCreeps.length;
						}
					} else {
						delete targetRoom.memory.hostileAlarm;
					}
					// We have vision of the room, that's good.
					if (!!targetRoom.controller && !! targetRoom.controller.reservation && !!targetRoom.controller.reservation.ticksToEnd) {
						config.controllerTTL = Memory.assimilation.config[roomName].controllerTTL  = targetRoom.controller.reservation.ticksToEnd;
					}
					if (!config.reserveOnly) {
						SourceManager.load(targetRoom);
						try {
							let containers: any[];
							try {
								containers = manageContainers();
							} catch (e) {
								console.log(`ERROR :: ASM in room ${roomName}: [CONTAINERS] ${e.message}`);
								containers = [];
							}
							if (containers.length > 0) {
								if (config.claim) {
									manageHarvest(containers);
									// manageMules(containers);
								} else {
									manageHarvest(containers);
									try {
										manageMules(containers);
									} catch (e) {
										console.log(`ERROR :: ASM in room ${roomName}: [MULES] ${e.message}`);
									}
								}
							}
						} catch (e) {
							console.log(`ERROR :: ASM in room ${roomName}: [HARVEST] ${e.message}`);
						}
						try {
							if (config.claim) {
								manageConstructions(2);
							} else if (!config.hasController) {
								// manageConstructions(3);
							} else {
								manageConstructions(1);
							}
						} catch (e) {
							console.log(`ERROR :: ASM in room ${roomName}: [CONSTRUCTION] ${e.message}`);
						}
					}
				} else {
					// no vision - decrease reservation TTL
					if (!!config.hasController && !!config.controllerTTL) {
						config.controllerTTL = Memory.assimilation.config[roomName].controllerTTL  = config.controllerTTL - 1;
					}
				}
				if (!config.reserveOnly) {
					try {
						if (goHome) {
							manageSourceKeepers(roomName, 2);
							manageDefenders(roomName, 0);
						} else {
							if (config.claim) {
								// manageDefenders(roomName, 1);
								// manageSourceKeepers(roomName, 0);
							} else if (!config.hasController) {
								manageSourceKeepers(roomName, 1);
							} else if (roomName === "W4N42" || roomName === "W2N45") { // surrounded by owned rooms, no invaders.
								manageDefenders(roomName, 0);
							} else {
								manageDefenders(roomName, 1);
								manageSourceKeepers(roomName, 0);
							}
						}
					} catch (e) {
						console.log(`ERROR :: ASM in room ${roomName}: [DEFENDERS] ${e.message}`);
					}
				}
			}
		} catch (e) {
			console.log(`ERROR :: ASM in room ${roomName}: [WRAPPER] ${e.message}`);
		}
	}, this);
}
