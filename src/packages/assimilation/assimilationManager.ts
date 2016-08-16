import ClaimGovernor from "./governors/claim";
import * as Config from "../../config/config";
import * as SourceManager from "../../components/sources/sourceManager";

import Claim from "./roles/claim";
import ASMBuilderGovernor from "./governors/builder";
import ASMBuilder from "./roles/builder";
import ASMHarvesterGovernor from "./governors/harvester";
import ASMHarvester from "./roles/harvester";
import ASMMuleGovernor from "./governors/mule";
import ASMMule from "./roles/mule";
import FasterminatorGovernor from "../warfare/governors/fasterminator";
import Terminator from "../warfare/roles/terminator";

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
let homeSpawn: Spawn;
let targetRoom: Room;

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

function createCreep(spawn: Spawn, creepConfig: CreepConfiguration): string|number {
	let status: number | string = spawn.canCreateCreep(creepConfig.body, creepConfig.name);
	if (status === OK) {
		status = spawn.createCreep(creepConfig.body, creepConfig.name, creepConfig.properties);

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
	let governor = new ClaimGovernor(homeRoom, homeSpawn, config, claim);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ClaimGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === roomName);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				let role: Claim = new Claim();
				role.setCreep(<Creep> creep);
				role.doClaim = claim;
				role.setGovernor(governor);
				role.action();
			}
		}, this);
	} else {
		if (!Game.rooms[roomName] || !Game.rooms[roomName].controller
			|| !Game.rooms[roomName].controller.reservation
			|| Game.rooms[roomName].controller.reservation.ticksToEnd < 1000
		) {
			createCreep(homeSpawn, governor.getCreepConfig());
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
	let sites = targetRoom.find(FIND_CONSTRUCTION_SITES, {
		filter: (cs: ConstructionSite) => cs.my,
	});
	let governor = new ASMBuilderGovernor(homeRoom, homeSpawn, config);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ASMBuilderGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				let role: ASMBuilder = new ASMBuilder();
				role.setCreep(<Creep> creep);
				role.setGovernor(governor);
				role.action();
			}
		}, this);
	}
	if (sites.length > 0) {
		// we need a builder
		if (creepsInRole.length < maxBuilders) {
			createCreep(homeSpawn, governor.getCreepConfig());
		}
	}
}

function manageHarvest(containers: StructureContainer[]) {
	if (containers.length > 0) {
		// we need harvesters
		let governor = new ASMHarvesterGovernor(homeRoom, homeSpawn, config, containers);
		let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ASMHarvesterGovernor.ROLE.toUpperCase()
		&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
		if (creepsInRole.length > 0) {
			_.each(creepsInRole, function (creep: Creep) {
				if (!creep.spawning) {
					let role: ASMHarvester = new ASMHarvester();
					role.setCreep(<Creep> creep);
					role.setGovernor(governor);
					role.action();
				}
			}, this);
		}
		if (creepsInRole.length < governor.getCreepLimit()) {
			createCreep(homeSpawn, governor.getCreepConfig());
		}
	}
}

function manageDefenders(limit: number = 0) {
	let governor = new FasterminatorGovernor(homeRoom, homeSpawn, config);
	let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === FasterminatorGovernor.ROLE.toUpperCase()
	&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
	if (creepsInRole.length > 0) {
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				let role: Terminator = new Terminator();
				role.setCreep(<Creep> creep);
				role.setGovernor(governor);
				role.action();
			}
		}, this);
	}
	if (creepsInRole.length < limit) {
		createCreep(homeSpawn, governor.getCreepConfig());
	}
}

function manageMules(containers: StructureContainer[]) {
	if (containers.length > 0) {
		// we need mules
		let governor = new ASMMuleGovernor(homeRoom, homeSpawn, config, containers);
		let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === ASMMuleGovernor.ROLE.toUpperCase()
		&& creep.memory.config.homeRoom === homeRoom.name && creep.memory.config.targetRoom === targetRoom.name);
		if (creepsInRole.length > 0) {
			_.each(creepsInRole, function (creep: Creep) {
				if (!creep.spawning) {
					let role: ASMMule = new ASMMule();
					role.setCreep(<Creep> creep);
					role.setGovernor(governor);
					role.action();
				}
			}, this);
		}
		if (creepsInRole.length < governor.getCreepLimit()) {
			createCreep(homeSpawn, governor.getCreepConfig());
		}
	}
}

export function govern(): void {
	setup();
	_.each(Memory.assimilation.targets, function(roomName) {
		if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
			config = getConfigForRemoteTarget(roomName);
			homeRoom = Game.rooms[config.homeRoom];
			homeSpawn = homeRoom.find<Spawn>(FIND_MY_SPAWNS)[0];
			targetRoom = Game.rooms[roomName];
			if (!targetRoom || !targetRoom.controller || targetRoom.controller.level < 1) {
				manageClaim(roomName, config.claim);
			}
			let vision: boolean = false;
			if (!!targetRoom) {
				// We have vision of the room, that's good.
				vision = true;
				targetRoom.addProperties();
				SourceManager.load(targetRoom);
				let hostiles = targetRoom.find(FIND_HOSTILE_CREEPS);
				if (hostiles.length > 0) {
					Game.notify(`Warning: Hostiles ${JSON.stringify(hostiles.length)} in room ${targetRoom.name} (ASM)`);
					manageDefenders(1);
				}
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
				manageDefenders();
				console.log(`AssimilationRoom ${roomName} has ${JSON.stringify(vision)} vision. `
					+ targetRoom.energyInContainers + "/" + targetRoom.containerCapacityAvailable
					+ " (" + targetRoom.energyPercentage + "%) in storage."
					+ " (RCL=" + targetRoom.controller.level + " @ "
				);
			}
		}
	}, this);
}