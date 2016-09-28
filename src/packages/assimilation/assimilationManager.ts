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
let CpuObject: any;

export function setup() {
	initMemory();
	global.assman = {
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

function manageClaim(roomName: string, claim: boolean = false) {
	let governor = new ClaimGovernor(homeRoom, config, claim);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ClaimGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			try {
				if (!creep.spawning) {
					let b = Game.cpu.getUsed();
					let role: Claim = new Claim();
					role.setCreep(<Creep> creep);
					role.setGoHome(goHome);
					role.doClaim = claim;
					role.setGovernor(governor);
					role.action();
					let a = Game.cpu.getUsed() - b;
					if (a > 2) {
						console.log(global.colorWrap(`Creep ${creep.name} (${creep.memory.role} in ${creep.room.name}) took ${_.round(a, 2)} to run.`, "Red"));
					}
				}
			} catch (e) {
				console.log("ERROR :: ", ClaimGovernor.ROLE, creep.name, creep.room.name, e.message);
			}
		}, this);
	} else {
		if (!Game.rooms[roomName]
			|| !Game.rooms[roomName].controller
			|| !Game.rooms[roomName].controller.reservation
			|| (Game.rooms[roomName].controller.reservation.ticksToEnd < 1000 && !isSpawning && !goHome)
		) {
			isSpawning = true;
			createCreep(governor.getCreepConfig(), true);
		}
	}
}
function manageContainers(): StructureContainer[] {
	let allContainers: StructureContainer[] = [];
	_.each(SourceManager.sources, function(source: Source) {
		let containers = targetRoom.allStructures.filter((s: Structure) => s.structureType === STRUCTURE_CONTAINER
			&& s.pos.isNearTo(source.pos)
		) as StructureContainer[];
		if (containers.length < 1) {
			// No containers yet. See if we're constructing one.
			let p = source.pos;
			let lookResults = source.room.lookForAtArea(LOOK_CONSTRUCTION_SITES, p.y - 1, p.x - 1, p.y + 1, p.x + 1, true) as LookAtResultWithPos[];
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
			try {
				if (!creep.spawning) {
					let b = Game.cpu.getUsed();
					let role: ASMBuilder = new ASMBuilder();
					role.setCreep(<Creep> creep);
					role.setGoHome(goHome);
					role.setGovernor(governor);
					role.action();
					let a = Game.cpu.getUsed() - b;
					if (a > 2) {
						console.log(global.colorWrap(`Creep ${creep.name} (${creep.memory.role} in ${creep.room.name}) took ${_.round(a, 2)} to run.`, "Red"));
					}
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
		let governor = new ASMHarvesterGovernor(homeRoom, config, containers);
		let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ASMHarvesterGovernor.ROLE.toUpperCase()
		&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
		if (creepsInRole.length > 0) {
			_.each(creepsInRole, function (creep: Creep) {
				try {
					if (!creep.spawning) {
						let b = Game.cpu.getUsed();
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
						let a = Game.cpu.getUsed() - b;
						if (a > 2) {
							console.log(global.colorWrap(`Creep ${creep.name} (${creep.memory.role} in ${creep.room.name}) took ${_.round(a, 2)} to run.`, "Red"));
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
	let governor = new SentinelGovernor(homeRoom, config);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === SentinelGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				try {
					let b = Game.cpu.getUsed();
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
					let a = Game.cpu.getUsed() - b;
					if (a > 2) {
						console.log(global.colorWrap(`Creep ${creep.name} (${creep.memory.role} in ${creep.room.name}) took ${_.round(a, 2)} to run.`, "Red"));
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
	let governor = new BullyGovernor(homeRoom, config);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === BullyGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			try {
				if (!creep.spawning) {
					let b = Game.cpu.getUsed();
					let role: Bully = new Bully();
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
							console.log("manageBullies.preempt-spawn", global.translateErrorCode(status));
						} else {
							console.log("manageBullies.preempt-spawn", status);
						}
					}
					let a = Game.cpu.getUsed() - b;
					if (a > 2) {
						console.log(global.colorWrap(`Creep ${creep.name} (${creep.memory.role} in ${creep.room.name}) took ${_.round(a, 2)} to run.`, "Red"));
					}
				}
			} catch (e) {
				console.log("ERROR :: ", BullyGovernor.ROLE, creep.name, creep.room.name, e.message);
			}
		}, this);
	}
	if (creepsInRole.length < limit && !isSpawning) {
		isSpawning = true;
		createCreep(governor.getCreepConfig(), true);
	}
}

function manageSourceKeepers(roomName: string, limit: number = 0) {
	if (!config.hasController) {
		manageBullies(roomName, limit);
		return;
	} else {
		let governor = new FasterminatorGovernor(homeRoom, config);
		let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === FasterminatorGovernor.ROLE.toUpperCase()
		&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
		if (creepsInRole.length > 0) {
			_.each(creepsInRole, function (creep: Creep) {
				try {
					if (!creep.spawning) {
						let b = Game.cpu.getUsed();
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
								console.log("manageSourceKeepers.preempt-spawn", global.translateErrorCode(status));
							} else {
								console.log("manageSourceKeepers.preempt-spawn", status);
							}
						}
						let a = Game.cpu.getUsed() - b;
						if (a > 2) {
							console.log(global.colorWrap(`Creep ${creep.name} (${creep.memory.role} in ${creep.room.name}) took ${_.round(a, 2)} to run.`, "Red"));
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
		let governor = new ASMMuleGovernor(homeRoom, config, containers);
		let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ASMMuleGovernor.ROLE.toUpperCase()
		&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
		if (creepsInRole.length > 0) {
			_.each(creepsInRole, function (creep: Creep) {
				try {
					if (!creep.spawning) {
						let b = Game.cpu.getUsed();
						let role: ASMMule = new ASMMule();
						role.setGovernor(governor);
						role.setCreep(<Creep> creep);
						role.setGoHome(goHome);
						role.action();
						let a = Game.cpu.getUsed() - b;
						if (a > 2) {
							console.log(global.colorWrap(`Creep ${creep.name} (${creep.memory.role} in ${creep.room.name}) took ${_.round(a, 2)} to run.`, "Red"));
						}
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
	CpuObject = {};
	_.each(Memory.assimilation.targets, (roomName: string) => {
		try {
			if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
				config = getConfigForRemoteTarget(roomName);
				config.hasController = _.get(config, "hasController", true);
				homeRoom = Game.rooms[config.homeRoom];
				targetRoom = Game.rooms[roomName];
				isSpawning = false;
				goHome = false;

				// Only manage claim in rooms with a controller (not in SK rooms).
				if (config.hasController && (!targetRoom || !targetRoom.controller || targetRoom.controller.level < 1)) {
					try {
						manageClaim(roomName, config.claim);
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
								// manageHarvest(containers);
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
							manageConstructions(0);
						} else if (!config.hasController) {
							manageConstructions(3);
						} else {
							manageConstructions(1);
						}
					} catch (e) {
						console.log(`ERROR :: ASM in room ${roomName}: [CONSTRUCTION] ${e.message}`);
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
						} else if (roomName === "W4N42") { // surrounded by owned rooms, no invaders.
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
		} catch (e) {
			console.log(`ERROR :: ASM in room ${roomName}: [WRAPPER] ${e.message}`);
		}
	}, this);
}
