import * as SourceManager from "../../components/sources/sourceManager";

import ClaimGovernor from "./governors/claim";
import Claim from "./roles/claim";

import ASMBuilderGovernor from "./governors/builder";
import ASMBuilder from "./roles/builder";

import ASMHarvesterGovernor from "./governors/harvester";
import ASMHarvester from "./roles/harvester";

import ASMMuleGovernor from "./governors/mule";
import ASMMule from "./roles/mule";

import SentinelGovernor from "../warfare/governors/sentinel";
import Terminator from "../warfare/roles/terminator";
/*import ASMRaiderGovernor from "./governors/raider";
import ASMRaider from "./roles/raider";*/
import FasterminatorGovernor from "../warfare/governors/fasterminator";
import BullyGovernor from "../warfare/governors/bully";
import Bully from "../warfare/roles/bully";

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
	const governor = new ClaimGovernor(homeRoom, config, claim, reserveOnly);
	const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ClaimGovernor.ROLE],
		(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName
	);
	if (creepsInRole.length > 0) {
		const role: Claim = new Claim();
		_.each(creepsInRole, function (creep: Creep) {
			try {
				if (!creep.spawning) {
					role.setCreep(<Creep> creep);
					role.setGoHome(goHome);
					role.doClaim = claim;
					role.setGovernor(governor);
				}
			} catch (e) {
				console.log("ERROR :: ", ClaimGovernor.ROLE, creep.name, creep.room.name, e.message);
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
			createCreep(governor.getCreepConfig(), true);
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
	const governor = new ASMBuilderGovernor(homeRoom, config);
	const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ASMBuilderGovernor.ROLE],
		(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
	if (creepsInRole.length > 0) {
		const role: ASMBuilder = new ASMBuilder();
		_.each(creepsInRole, function (creep: Creep) {
			try {
				if (!creep.spawning) {
					role.setCreep(<Creep> creep);
					role.setGoHome(goHome);
					role.setGovernor(governor);
					role.action();
				}
			} catch (e) {
				console.log("ERROR :: ", ASMBuilderGovernor.ROLE, creep.name, creep.room.name, e.message);
			}
		}, this);
	}
	if (sites.length > 0) {
		// we need a builder
		if (creepsInRole.length < maxBuilders && !isSpawning && !goHome) {
			isSpawning = true;
			createCreep(governor.getCreepConfig());
		}
	}
}

function manageHarvest(containers: StructureContainer[]) {
	if (containers.length > 0) {
		// we need harvesters
		const governor = new ASMHarvesterGovernor(homeRoom, config, containers);
		const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ASMHarvesterGovernor.ROLE],
			(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
		if (creepsInRole.length > 0) {
			const role: ASMHarvester = new ASMHarvester();
			_.each(creepsInRole, function (creep: Creep) {
				try {
					if (!creep.spawning) {
						if (!creep.memory.container) {
							creep.memory.container = governor.checkContainerAssignment();
						}
						role.setGovernor(governor);
						role.setGoHome(goHome);
						role.setCreep(<Creep> creep);
						role.action();
						if (creep.ticksToLive < 100 && (creepsInRole.length === governor.getCreepLimit()) && !isSpawning && !goHome) {
							// Do a preemptive spawn if this creep is about to expire.
							isSpawning = true;
							const status = createCreep(governor.getCreepConfig());
							if (_.isNumber(status)) {
								console.log("manageHarvesters.preempt-spawn", global.translateErrorCode(status));
							} else {
								console.log("manageHarvesters.preempt-spawn", status);
							}
						}
					}
				} catch (e) {
					console.log("ERROR :: ", ASMHarvesterGovernor.ROLE, creep.name, creep.room.name, e.message);
				}
			}, this);
		}
		if (creepsInRole.length < governor.getCreepLimit() && !isSpawning && !goHome) {
			isSpawning = true;
			createCreep(governor.getCreepConfig());
		}
	}
}

function manageDefenders(roomName: string, limit: number = 0) {
	const governor = new SentinelGovernor(homeRoom, config);
	const creepsInRole: Creep[] = _.filter(global.tickCache.roles[SentinelGovernor.ROLE],
		(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (creepsInRole.length > 0) {
		const role: Terminator = new Terminator();
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				try {
					role.setCreep(<Creep> creep);
					role.setGovernor(governor);
					role.action();
					if (creep.ticksToLive < 100 && (creepsInRole.length === limit) && !isSpawning) {
						// Do a preemptive spawn if this creep is about to expire.
						isSpawning = true;
						// TODO: might wanna remove the true here later
						const status = createCreep(governor.getCreepConfig(), true);
						if (_.isNumber(status)) {
							console.log("manageDefenders.preempt-spawn", global.translateErrorCode(status));
						} else {
							console.log("manageDefenders.preempt-spawn", status);
						}
					}
				} catch (e) {
					console.log("ERROR :: ", SentinelGovernor.ROLE, creep.name, creep.room.name, e.message);
				}
			}
		}, this);
	}
	if (creepsInRole.length < limit && !isSpawning) {
		isSpawning = true;
		createCreep(governor.getCreepConfig(), true);
	}
}

function manageBullies(roomName: string, limit: number = 0) {
	const governor = new BullyGovernor(homeRoom, config);
	const creepsInRole: Creep[] = _.filter(global.tickCache.roles[BullyGovernor.ROLE],
		(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (!!creepsInRole && creepsInRole.length > 0) {
		const role: Bully = new Bully();
		_.each(creepsInRole, function (creep: Creep) {
			try {
				if (!creep.spawning) {
					role.setCreep(<Creep> creep);
					role.setGovernor(governor);
					if (!config.hasController) {
						role.sourceKeeperDuty = true;
					}
					role.action();
					if (creep.ticksToLive < 200 && (creepsInRole.length === limit) && !isSpawning) {
						// Do a preemptive spawn if this creep is about to expire.
						isSpawning = true;
						// TODO: might wanna remove the true here later
						const status = createCreep(governor.getCreepConfig(), true);
						if (_.isNumber(status)) {
							console.log("manageBullies.preempt-spawn", global.translateErrorCode(status));
						} else {
							console.log("manageBullies.preempt-spawn", status);
						}
					}
				}
			} catch (e) {
				console.log("ERROR :: ", BullyGovernor.ROLE, creep.name, creep.room.name, e.message);
			}
		}, this);
	}
	if (!!creepsInRole && creepsInRole.length < limit && !isSpawning) {
		isSpawning = true;
		createCreep(governor.getCreepConfig(), true);
	}
}

function manageSourceKeepers(roomName: string, limit: number = 0) {
	if (!config.hasController) {
		manageBullies(roomName, limit);
		return;
	} else {
		const governor = new FasterminatorGovernor(homeRoom, config);
		const creepsInRole: Creep[] = _.filter(global.tickCache.roles[FasterminatorGovernor.ROLE],
			(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
		if (creepsInRole.length > 0) {
			const role: Terminator = new Terminator();
			_.each(creepsInRole, function (creep: Creep) {
				try {
					if (!creep.spawning) {
						role.setCreep(<Creep> creep);
						role.setGovernor(governor);
						if (!config.hasController) {
							role.sourceKeeperDuty = true;
						}
						role.action();
						if (creep.ticksToLive < 200 && (creepsInRole.length === limit) && !isSpawning) {
							// Do a preemptive spawn if this creep is about to expire.
							isSpawning = true;
							// TODO: might wanna remove the true here later
							const status = createCreep(governor.getCreepConfig(), true);
							if (_.isNumber(status)) {
								console.log("manageSourceKeepers.preempt-spawn", global.translateErrorCode(status));
							} else {
								console.log("manageSourceKeepers.preempt-spawn", status);
							}
						}
					}
				} catch (e) {
					console.log("ERROR :: ", FasterminatorGovernor.ROLE, creep.name, creep.room.name, e.message);
				}
			}, this);
		}
		if (creepsInRole.length < limit && !isSpawning) {
			isSpawning = true;
			createCreep(governor.getCreepConfig(), true);
		}
	}
}

function manageMules(containers: StructureContainer[]) {
	if (containers.length > 0) {
		// we need mules
		const governor = new ASMMuleGovernor(homeRoom, config, containers);
		const creepsInRole: Creep[] = _.filter(global.tickCache.roles[ASMMuleGovernor.ROLE],
			(creep: Creep) => creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
		if (creepsInRole.length > 0) {
			const role: ASMMule = new ASMMule();
			_.each(creepsInRole, function (creep: Creep) {
				try {
					if (!creep.spawning) {
						role.setGovernor(governor);
						role.setCreep(<Creep> creep);
						role.setGoHome(goHome);
						role.action();
					}
				} catch (e) {
					console.log("ERROR :: ", ASMMuleGovernor.ROLE, creep.name, creep.room.name, e.message);
				}
			}, this);
		}
		if (creepsInRole.length < governor.getCreepLimit() && !isSpawning && !goHome) {
			isSpawning = true;
			createCreep(governor.getCreepConfig());
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
						Game.notify(`Warning: ${targetRoom.hostileCreeps.length} hostiles in ${targetRoom.name} from ${targetRoom.hostileCreeps[0].owner.username}`);
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
