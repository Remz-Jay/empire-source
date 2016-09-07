import * as SourceManager from "../../components/sources/sourceManager";
import * as RoomManager from "../../components/rooms/roomManager";
import * as StatsManager from "../../shared/statsManager";

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
import FasterminatorGovernor from "../warfare/governors/fasterminator";

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
let CpuObject: any;

function setup() {
	initMemory();
	Game.assman = {
		add(roomName: string, claim: boolean = false, hasController = true, homeRoomName?: string) {
			if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
				Memory.assimilation.targets.push(roomName);
				if (!!homeRoomName && !_.isNaN(Game.map.getRoomLinearDistance("W1N1", homeRoomName))) {
					getConfigForRemoteTarget(roomName, claim, hasController, homeRoomName);
				} else {
					getConfigForRemoteTarget(roomName, claim, hasController);
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
function getConfigForRemoteTarget(remoteRoomName: string, claim: boolean = false, hasController = true, homeRoomName?: string): RemoteRoomConfig {
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
			hasController: hasController,
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

function updateCpuObject(role: string, numCreeps: number, cpuUsed: number) {
	if (!CpuObject[role]) {
		CpuObject[role] = {
			numCreeps: numCreeps,
			cpu: cpuUsed,
		};
	} else {
		CpuObject[role].numCreeps += numCreeps;
		CpuObject[role].cpu += cpuUsed;
	}
}

function manageClaim(roomName: string, claim: boolean = false) {
	let CpuBeforeRole: number = Game.cpu.getUsed();
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
	updateCpuObject(ClaimGovernor.ROLE, creepsInRole.length, Game.cpu.getUsed() - CpuBeforeRole);
}
function manageContainers(): StructureContainer[] {
	let allContainers: StructureContainer[] = [];
	_.each(SourceManager.sources, function(source: Source) {
		let containers = targetRoom.allStructures.filter((s: Structure) => s.structureType === STRUCTURE_CONTAINER
			&& s.pos.isNearTo(source.pos)
		) as StructureContainer[];
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
	let CpuBeforeRole: number = Game.cpu.getUsed();
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
	updateCpuObject(ASMBuilderGovernor.ROLE, creepsInRole.length, Game.cpu.getUsed() - CpuBeforeRole);
}

function manageHarvest(containers: StructureContainer[]) {
	let CpuBeforeRole: number = Game.cpu.getUsed();
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
							console.log("manageHarvesters.preempt-spawn", global.translateErrorCode(status));
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
		updateCpuObject(ASMHarvesterGovernor.ROLE, creepsInRole.length, Game.cpu.getUsed() - CpuBeforeRole);
	}
}

function manageDefenders(roomName: string, limit: number = 0) {
	let CpuBeforeRole: number = Game.cpu.getUsed();
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
				if (creep.ticksToLive < 100 && (creepsInRole.length === limit) && !isSpawning) {
					// Do a preemptive spawn if this creep is about to expire.
					isSpawning = true;
					// TODO: might wanna remove the true here later
					let status = createCreep(governor.getCreepConfig(), true);
					if (_.isNumber(status)) {
						console.log("manageDefenders.preempt-spawn", global.translateErrorCode(status));
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
	updateCpuObject(SentinelGovernor.ROLE, creepsInRole.length, Game.cpu.getUsed() - CpuBeforeRole);
}

function manageSourceKeepers(roomName: string, limit: number = 0) {
	let CpuBeforeRole: number = Game.cpu.getUsed();
	let governor = new FasterminatorGovernor(homeRoom, config);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === FasterminatorGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				let role: Terminator = new Terminator();
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
					let status = createCreep(governor.getCreepConfig(), true);
					if (_.isNumber(status)) {
						console.log("manageDefenders.preempt-spawn", global.translateErrorCode(status));
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
	updateCpuObject(FasterminatorGovernor.ROLE, creepsInRole.length, Game.cpu.getUsed() - CpuBeforeRole);
}

function manageMules(containers: StructureContainer[]) {
	let CpuBeforeRole: number = Game.cpu.getUsed();
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
		updateCpuObject(ASMMuleGovernor.ROLE, creepsInRole.length, Game.cpu.getUsed() - CpuBeforeRole);
	}
}

function manageRaiders(roomName: string) {
	let CpuBeforeRole: number = Game.cpu.getUsed();
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
	updateCpuObject(ASMRaiderGovernor.ROLE, creepsInRole.length, Game.cpu.getUsed() - CpuBeforeRole);
}

export function govern(): void {
	setup();
	CpuObject = {};
	_.each(Memory.assimilation.targets, function(roomName) {
		try {
			if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
				config = getConfigForRemoteTarget(roomName);
				config.hasController = _.get(config, "hasController", true);
				homeRoom = RoomManager.getRoomByName(config.homeRoom);
				targetRoom = RoomManager.getRoomByName(roomName);
				isSpawning = false;
				goHome = false;

				// Fridge Raider Override.
				if (roomName === "W3N42") {
					try {
						manageRaiders(roomName);
					} catch (e) {
						console.log(e.message, "ASM.manageRaiders");
					}
					return;
				}

				// Only manage claim in rooms with a controller (not in SK rooms).
				if (config.hasController && (!targetRoom || !targetRoom.controller || targetRoom.controller.level < 1)) {
					try {
						manageClaim(roomName, config.claim);
					} catch (e) {
						throw new Error("manageClaim." + (<Error> e).message);
					}
				}
				let vision: boolean = false;
				if (!!targetRoom) {
					if (config.hasController && targetRoom.hostileCreeps.length > 1) { // It makes no sense to check for hostiles in SK rooms.
						goHome = true;
						Game.notify(`Warning: ${targetRoom.hostileCreeps.length} hostiles in ${targetRoom.name} from ${targetRoom.hostileCreeps[0].owner.username}`);
					} else if (config.hasController && targetRoom.hostileCreeps.length > 0 && targetRoom.hostileCreeps[0].owner.username === "Tharit") {
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
							manageConstructions(0);
						} else {
							manageConstructions(1);
						}
					} catch (e) {
						throw new Error("Rest." + (<Error> e).message);
					}
					Memory.log.asm.push(`AssimilationRoom ${roomName} has ${targetRoom.energyInContainers}/${targetRoom.containerCapacityAvailable}`
						+ `(${targetRoom.energyPercentage}%) in storage.`
					);
				}
				try {
					if (goHome) {
						manageSourceKeepers(roomName, 2);
						manageDefenders(roomName, 0);
					} else {
						if (config.claim) {
							manageDefenders(roomName, 1);
							manageSourceKeepers(roomName, 0);
						} else if (!config.hasController) {
							manageSourceKeepers(roomName, 1);
						} else {
							manageDefenders(roomName, 1);
							manageSourceKeepers(roomName, 0);
						}
					}
				} catch (e) {
					throw new Error("manageDefenders." + (<Error> e).message);
				}
			}
		} catch (e) {
			throw new Error(`ERROR :: ASM in room ${roomName}: ${e.message}`);
		}
	}, this);
	try {
		let unifiedObject: any = {};
		_.forOwn(CpuObject, (y: any, key: string) => { // Role
			if (!!unifiedObject[key]) {
				unifiedObject[key].numCreeps += y.numCreeps;
				unifiedObject[key].cpu += y.cpu;
			} else {
				unifiedObject[key] = {
					numCreeps: y.numCreeps,
					cpu: y.cpu,
				};
			}
		});
		_.forOwn(unifiedObject, (x: any, key: string) => {
			StatsManager.addStat(`cpu.perrole.${key}.cpu`, x.cpu);
			StatsManager.addStat(`cpu.perrole.${key}.creeps`, x.numCreeps);
			StatsManager.addStat(`cpu.perrole.${key}.cpupercreep`, x.cpu / x.numCreeps);
		});
	} catch (e) {
		console.log(`ERROR :: PerRole Stats: ${e.message}`);
	}
}
