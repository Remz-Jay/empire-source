import * as Config from "../../config/config";
import * as SourceManager from "../../components/sources/sourceManager";
import * as RoomManager from "../../components/rooms/roomManager";

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
import ASMRaiderGovernor from "./governors/raider";
import ASMRaider from "./roles/raider";

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

function setup() {
	initMemory();
	Game.assman = {
		add(roomName: string, claim: boolean = false, homeRoomName?: string) {
			if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
				Memory.assimilation.targets.push(roomName);
				if (!!homeRoomName && !_.isNaN(Game.map.getRoomLinearDistance("W1N1", homeRoomName))) {
					getConfigForRemoteTarget(roomName, claim, homeRoomName);
				} else {
					getConfigForRemoteTarget(roomName, claim);
				}
				console.log(`Added ${roomName} for assimilation.`);
			} else {
				console.log(`Room ${roomName} does not exist.`);
			}
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
			let parsed: any = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
			let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
			let isMyRoom = Game.rooms[roomName] &&
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
function getConfigForRemoteTarget(remoteRoomName: string, claim: boolean = false, homeRoomName?: string): RemoteRoomConfig {
	if (!!Memory.assimilation.config[remoteRoomName]) {
		return Memory.assimilation.config[remoteRoomName];
	} else {
		// Find the nearest owned room.
		let distance: number = Infinity;
		let target: string = undefined;
		let optimalRoute: findRouteArray = undefined;
		if (!!homeRoomName && !_.isNaN(Game.map.getRoomLinearDistance("W1N1", homeRoomName))) {
			let route = findRoute(homeRoomName, remoteRoomName);
			if (!_.isNumber(route) && route.length < distance) {
				distance = route.length;
				optimalRoute = route;
				target = homeRoomName;
			}
		} else {
			for (let room in Game.rooms) {
				if (room !== remoteRoomName) {
					let route = findRoute(room, remoteRoomName);
					if (!_.isNumber(route) && route.length < distance) {
						distance = route.length;
						optimalRoute = route;
						target = room;
					}
				}
			}
		}
		let roomConfig: RemoteRoomConfig = {
			homeRoom: target,
			targetRoom: remoteRoomName,
			homeDistance: distance,
			route: optimalRoute,
			claim: claim,
		};
		Memory.assimilation.config[remoteRoomName] = roomConfig;
		return roomConfig;
	}
}

function createCreep(creepConfig: CreepConfiguration, priority: boolean = false): string|number {
	let spawn: StructureSpawn = homeRoom.getFreeSpawn();
	let status: number | string = spawn.canCreateCreep(creepConfig.body, creepConfig.name);
	if (status === OK) {
		if (priority) {
			status = spawn.createCreep(creepConfig.body, creepConfig.name, creepConfig.properties);
		} else {
			status = spawn.createCreepWhenIdle(creepConfig.body, creepConfig.name, creepConfig.properties);
		}
		if (Config.VERBOSE) {
			if (_.isNumber(status)) {
				console.log(`Unable to create ${creepConfig.properties.role} Creep (${status})`);
			} else {
				console.log(`Started creating new ${creepConfig.properties.role} Creep ${status}`);
			}
		}
	}
	return status;
}
function manageClaim(roomName: string, claim: boolean = false) {
	let governor = new ClaimGovernor(homeRoom, config, claim);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ClaimGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				let role: Claim = new Claim();
				role.setCreep(<Creep> creep);
				role.setGoHome(goHome);
				role.doClaim = claim;
				role.setGovernor(governor);
				role.action();
			}
		}, this);
	} else {
		if (!Game.rooms[roomName] || !Game.rooms[roomName].controller
			|| !Game.rooms[roomName].controller.reservation
			|| (Game.rooms[roomName].controller.reservation.ticksToEnd < 1000
				&& !isSpawning && !goHome)
		) {
			isSpawning = true;
			createCreep(governor.getCreepConfig(), true);
		}
	}
}
function manageContainers(): StructureContainer[] {
	let allContainers: StructureContainer[] = [];
	_.each(SourceManager.sources, function(source: Source) {
		let containers = source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
			filter: (structure: Structure) => structure.structureType === STRUCTURE_CONTAINER,
		});
		if (containers.length < 1) {
			// No containers yet. See if we're constructing one.
			let sites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
				filter: (site: ConstructionSite) => site.my && site.structureType === STRUCTURE_CONTAINER,
			});
			if (sites.length < 1) {
				// Nope, prepare one.
				let slots = SourceManager.getMiningSlots(source);
				let slot = slots[0];
				targetRoom.createConstructionSite(slot.x, slot.y, STRUCTURE_CONTAINER);
			}
		} else {
			allContainers = allContainers.concat(containers[0]); // In case there's more containers per source, just use 1.
		}
	}, this);
	return allContainers;
}

function manageConstructions(maxBuilders: number = 1) {
	let sites = targetRoom.myConstructionSites;
	let governor = new ASMBuilderGovernor(homeRoom, config);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ASMBuilderGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				let role: ASMBuilder = new ASMBuilder();
				role.setCreep(<Creep> creep);
				role.setGoHome(goHome);
				role.setGovernor(governor);
				role.action();
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
		let governor = new ASMHarvesterGovernor(homeRoom, config, containers);
		let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ASMHarvesterGovernor.ROLE.toUpperCase()
		&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
		if (creepsInRole.length > 0) {
			_.each(creepsInRole, function (creep: Creep) {
				if (!creep.spawning) {
					if (!creep.memory.container) {
						creep.memory.container = governor.checkContainerAssignment();
					}
					let role: ASMHarvester = new ASMHarvester();
					role.setGovernor(governor);
					role.setGoHome(goHome);
					role.setCreep(<Creep> creep);
					role.action();
					if (creep.ticksToLive < 100 && (creepsInRole.length === governor.getCreepLimit()) && !isSpawning && !goHome) {
						// Do a preemptive spawn if this creep is about to expire.
						isSpawning = true;
						let status = createCreep(governor.getCreepConfig());
						if (_.isNumber(status)) {
							console.log("manageHarvesters.preempt-spawn", Config.translateErrorCode(status));
						} else {
							console.log("manageHarvesters.preempt-spawn", status);
						}
					}
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
	let governor = new SentinelGovernor(homeRoom, config);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === SentinelGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				let role: Terminator = new Terminator();
				role.setCreep(<Creep> creep);
				role.setGovernor(governor);
				role.action();
				if (creep.ticksToLive < 100 && (creepsInRole.length === governor.getCreepLimit()) && !isSpawning) {
					// Do a preemptive spawn if this creep is about to expire.
					isSpawning = true;
					// TODO: might wanna remove the true here later
					let status = createCreep(governor.getCreepConfig(), true);
					if (_.isNumber(status)) {
						console.log("manageDefenders.preempt-spawn", Config.translateErrorCode(status));
					} else {
						console.log("manageDefenders.preempt-spawn", status);
					}
				}
			}
		}, this);
	}
	if (creepsInRole.length < limit && !isSpawning) {
		isSpawning = true;
		createCreep(governor.getCreepConfig(), true);
	}
}

function manageMules(containers: StructureContainer[]) {
	if (containers.length > 0) {
		// we need mules
		let governor = new ASMMuleGovernor(homeRoom, config, containers);
		let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ASMMuleGovernor.ROLE.toUpperCase()
		&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
		if (creepsInRole.length > 0) {
			_.each(creepsInRole, function (creep: Creep) {
				if (!creep.spawning) {
					let role: ASMMule = new ASMMule();
					role.setCreep(<Creep> creep);
					role.setGoHome(goHome);
					role.setGovernor(governor);
					role.action();
				}
			}, this);
		}
		if (creepsInRole.length < governor.getCreepLimit() && !isSpawning && !goHome) {
			isSpawning = true;
			createCreep(governor.getCreepConfig());
		}
	}
}

function manageRaiders(roomName: string) {
	// we need raiders
	let governor = new ASMRaiderGovernor(homeRoom, config);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ASMRaiderGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				let role: ASMRaider = new ASMRaider();
				role.setCreep(<Creep> creep);
				role.setGoHome(goHome);
				role.setGovernor(governor);
				role.action();
			}
		}, this);
	}
	if (creepsInRole.length < governor.getCreepLimit() && !isSpawning && !goHome) {
		isSpawning = true;
		createCreep(governor.getCreepConfig());
	}
}

export function govern(): void {
	setup();
	_.each(Memory.assimilation.targets, function(roomName) {
		try {
			if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
				config = getConfigForRemoteTarget(roomName);
				homeRoom = RoomManager.getRoomByName(config.homeRoom);
				targetRoom = RoomManager.getRoomByName(roomName);
				isSpawning = false;
				goHome = false;
				if (roomName === "W3N42") {
					try {
						manageRaiders(roomName);
					} catch (e) {
						console.log(e.message, "ASM.manageRaiders");
					}
					return;
				}
				if (!targetRoom || !targetRoom.controller || targetRoom.controller.level < 1) {
					try {
						manageClaim(roomName, config.claim);
					} catch (e) {
						throw new Error("manageClaim." + (<Error> e).message);
					}
				}
				let vision: boolean = false;
				if (!!targetRoom) {
					if (targetRoom.hostileCreeps.length > 1) {
						goHome = true;
						Game.notify(`Warning: ${targetRoom.hostileCreeps.length} hostiles in ${targetRoom.name} from ${targetRoom.hostileCreeps[0].owner.username}`);
					}
					// We have vision of the room, that's good.
					vision = true;
					SourceManager.load(targetRoom);
					try {
						let containers = manageContainers();
						if (containers.length > 0) {
							if (config.claim) {
								manageHarvest(containers);
								// manageMules(containers);
							} else {
								manageHarvest(containers);
								manageMules(containers);
							}
						}
						if (config.claim) {
							// manageConstructions(1);
						} else {
							manageConstructions(1);
						}
					} catch (e) {
						throw new Error("Rest." + (<Error> e).message);
					}
					console.log(`AssimilationRoom ${roomName} has ${targetRoom.energyInContainers}/${targetRoom.containerCapacityAvailable}`
						+ `(${targetRoom.energyPercentage}%) in storage.`
					);
				}
				try {
					if (goHome) {
						// manageDefenders(roomName, targetRoom.hostileCreeps.length);
						manageDefenders(roomName, 2);
					} else {
						manageDefenders(roomName, 1);
					}
				} catch (e) {
					throw new Error("manageDefenders." + (<Error> e).message);
				}
			}
		} catch (e) {
			throw new Error("YOLO." + (<Error> e).message);
		}
	}, this);
}
