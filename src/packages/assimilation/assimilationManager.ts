import ClaimGovernor from "./governors/claim";
import * as Config from "../../config/config";
import * as SourceManager from "../../components/sources/sourceManager";

import Claim from "./roles/claim";
import ASMBuilderGovernor from "./governors/builder";
import ASMBuilder from "./roles/builder";

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
		add(roomName: string) {
			if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
				Memory.assimilation.targets.push(roomName);
				console.log(`Added ${roomName} for assimilation.`);
			} else {
				console.log(`Room ${roomName} does not exist.`);
			}
		},
		remove(roomName: string) {
			Memory.assimilation.targets = _.pull(Memory.assimilation.targets, roomName);
			console.log(`Removed ${roomName} from the assimilation targets.`);
		},
	};
}
function getConfigForRemoteTarget(remoteRoomName: string): RemoteRoomConfig {
	if (!!Memory.assimilation.config[remoteRoomName]) {
		return Memory.assimilation.config[remoteRoomName];
	} else {
		// Find the nearest owned room.
		let distance: number = Infinity;
		let target: string = undefined;
		let optimalRoute: findRouteArray = undefined;
		for (let room in Game.rooms) {
			let route = Game.map.findRoute(room, remoteRoomName, {
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
			if (!_.isNumber(route) && route.length < distance) {
				distance = route.length;
				optimalRoute = route;
				target = room;
			}
		}
		let roomConfig: RemoteRoomConfig = {
			homeRoom: target,
			targetRoom: remoteRoomName,
			homeDistance: distance,
			route: optimalRoute,
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
	let governor = new ClaimGovernor(homeRoom, homeSpawn, config);
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
		createCreep(homeSpawn, governor.getCreepConfig());
	}
}
function manageContainers() {
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
		}
	}, this);
}

function manageConstructions(skip: boolean = true) {
	if (skip) {
		return;
	}
	let sites = targetRoom.find(FIND_CONSTRUCTION_SITES, {
		filter: (cs: ConstructionSite) => cs.my,
	});
	if (sites.length > 0) {
		// we need a builder
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
		} else {
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
			manageClaim(roomName, false);
			let vision: boolean = false;
			if (!!targetRoom) {
				// We have vision of the room, that's good.
				vision = true;
				SourceManager.load(targetRoom);
				manageContainers();
				manageConstructions();
				console.log(`AssimilationRoom ${roomName} has ${JSON.stringify(vision)} vision. `
					+ targetRoom.energyInContainers + "/" + targetRoom.containerCapacityAvailable
					+ " (" + targetRoom.energyPercentage + "%) in targetRoom."
					+ " (RCL=" + targetRoom.controller.level + " @ "
					+ targetRoom.controller.reservation.ticksToEnd
					+ " (" + targetRoom.controller.reservation.username + "))"
				);
			}
		}
	}, this);
}
