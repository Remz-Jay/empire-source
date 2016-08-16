import * as Config from "../../../../config/config";
import WarfareCreepAction from "../../warfareCreepAction";
import TankGovernor from "../../governors/tank";
import Tank from "../../roles/tank";
import FasterminatorGovernor from "../../governors/fasterminator";
import Terminator from "../../roles/terminator";
import Healer from "../../roles/healer";
import HealerGovernor from "../../governors/healer";
import FastankGovernor from "../../governors/fastank";
/*import WarriorGovernor from "../../governors/warrior";
import RangerGovernor from "../../governors/ranger";
import HealerGovernor from "../../governors/healer";
import Warrior from "../../roles/warrior";
import Ranger from "../../roles/ranger";
import Healer from "../../roles/healer";
import TerminatorGovernor from "../../governors/terminator";

import ScoutGovernor from "../../governors/scout";
import Scout from "../../roles/scout";

*/

function initMemory(): void {
	if (!Memory.offense) {
		Memory.offense = {
			targets: [],
			config: {},
		};
	}
}

let config: RemoteRoomConfig;
let homeRoom: Room;
let homeSpawn: Spawn;
let targetRoom: Room;

let squadConfig = {
	roles: [
		{
			"governor": FasterminatorGovernor,
			"role": Terminator,
			"maxCreeps": 1,
		},
	],
	wait: false,
};

let sqibConfig = {
	roles: [
		{
			"governor": FasterminatorGovernor,
			"role": Terminator,
			"maxCreeps": 0,
		},
	],
	wait: false,
};

let artilleryConfig = {
	roles: [
		{
			"governor": TankGovernor,
			"role": Tank,
			"maxCreeps": 1,
		},
		{
			"governor": HealerGovernor,
			"role": Healer,
			"maxCreeps": 1,
		},
	],
	wait: false,
};

let assaultConfig = {
	roles: [
		{
			"governor": FastankGovernor,
			"role": Tank,
			"maxCreeps": 0,
		},
		{
			"governor": TankGovernor,
			"role": Tank,
			"maxCreeps": 2,
		},
		{
			"governor": HealerGovernor,
			"role": Healer,
			"maxCreeps": 2,
		},
	],
	wait: false,
};

let schmoopPositions: RoomPosition[] = [
	new RoomPosition(33, 11, "W6N40"),
	new RoomPosition(40, 6, "W3N40"),
	new RoomPosition(36, 46, "W3N41"),
];

let assaultPositions: RoomPosition[] = [
	new RoomPosition(2, 32, "W4N42"),
	new RoomPosition(43, 31, "W5N42"),
].reverse();

let positions: RoomPosition[] = [
	new RoomPosition(14, 2, "W3N42"),
	new RoomPosition(14, 43, "W3N43"),
	new RoomPosition(2, 41, "W4N43"),
	new RoomPosition(47, 41, "W5N43"),
	new RoomPosition(30, 38, "W5N43"),
	new RoomPosition(7, 8, "W5N42"),
].reverse();

/*let squadConfig = {
	roles: [
		{
			"governor": ScoutGovernor,
			"role": Scout,
			"maxCreeps": 0,
		},
		{
			"governor": TerminatorGovernor,
			"role": Terminator,
			"maxCreeps": 0,
		},
		{
			"governor": FasterminatorGovernor,
			"role": Terminator,
			"maxCreeps": 2,
		},
	],
	wait: false,
};*/

/*
let squadConfig = {
	roles: [
		{
			"governor": WarriorGovernor,
			"role": Warrior,
			"maxCreeps": 1,
		},
		{
			"governor": RangerGovernor,
			"role": Ranger,
			"maxCreeps": 1,
		},
		{
			"governor": HealerGovernor,
			"role": Healer,
			"maxCreeps": 1,
		},
	],
};
*/

function setup() {
	initMemory();
	Game.offense = {
		add(roomName: string, homeRoomName?: string) {
			if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
				Memory.offense.targets.push(roomName);
				if (!!homeRoomName && !_.isNaN(Game.map.getRoomLinearDistance("W1N1", homeRoomName))) {
					getConfigForRemoteTarget(roomName, homeRoomName);
				} else {
					getConfigForRemoteTarget(roomName);
				}
				console.log(`Added ${roomName} for Assault.`);
			} else {
				console.log(`Room ${roomName} does not exist.`);
			}
		},
		remove(roomName: string) {
			Memory.offense.targets = _.pull(Memory.offense.targets, roomName);
			delete Memory.offense.config[roomName];
			console.log(`Removed ${roomName} from the Assault targets.`);
		},
	};
}

function findRoute(fromRoom: string, toRoom: string): findRouteArray | number {
	return Game.map.findRoute(fromRoom, toRoom, {
		routeCallback(roomName) {
			let parsed: any = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
			let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
			let username = _.get(
				_.find(Game.structures, (s) => true), "owner.username",
				_.get(_.find(Game.creeps, (s) => true), "owner.username")
			) as string;
			let isMyRoom = Game.rooms[roomName] &&
				Game.rooms[roomName].controller &&
				Game.rooms[roomName].controller.my;
			let isMyReservedRoom = Game.rooms[roomName] &&
				Game.rooms[roomName].controller &&
				Game.rooms[roomName].controller.reservation &&
				Game.rooms[roomName].controller.reservation.username === username;
			if (isHighway || isMyRoom || isMyReservedRoom) {
				return 1;
			} else {
				return 2.5;
			}
		},
	});
}

function getConfigForRemoteTarget(remoteRoomName: string, homeRoomName?: string): RemoteRoomConfig {
	initMemory();
	if (!!Memory.offense.config[remoteRoomName]) {
		return Memory.offense.config[remoteRoomName];
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
		};
		Memory.offense.config[remoteRoomName] = roomConfig;
		return roomConfig;
	}
}

function createCreep(spawn: Spawn, creepConfig: CreepConfiguration): string|number {
	let status: number | string = spawn.canCreateCreep(creepConfig.body, creepConfig.name);
	if (status === OK) {
		status = spawn.createCreep(creepConfig.body, creepConfig.name, creepConfig.properties);

		if (Config.VERBOSE) {
			if (_.isNumber(status)) {
				console.log(`Unable to create ${creepConfig.properties.role} Creep (${Config.translateErrorCode(status)})`);
			} else {
				console.log(`Started creating new ${creepConfig.properties.role} Creep ${status}`);
			}
		}
	}
	return status;
}
function loadCreeps(targetRoomName: string, sq: any): Creep[] {
	let creeps: Creep[] = [];
	_.each(sq.roles, function(role) {
		creeps = creeps.concat(_.filter(Game.creeps, (c: Creep) =>
			c.memory.role === role.governor.ROLE
			&& c.memory.homeRoom === homeRoom.name
			&& c.memory.config.targetRoom === targetRoomName
			&& !c.spawning,
		));
	}, this);
	return creeps;
}
function manageSquad(targetRoomName: string, sq: any, targetPositions: RoomPosition[]) {
	let creeps = loadCreeps(targetRoomName, sq);
	// TODO: Make the squad wait for the last spawning member.
	let squadSize = _.sum(sq.roles, "maxCreeps");
	let wait: boolean = false;
	if (sq.wait && creeps.length < squadSize) {
		wait = true;
	}
	_.each(sq.roles, function(squadRole) {
		let governor = new squadRole.governor(homeRoom, homeSpawn, config);
		let creepsInRole = _.filter(creeps, (c: Creep) => c.memory.role === squadRole.governor.ROLE);
		console.log(squadRole.governor.ROLE, squadRole.maxCreeps, targetRoomName, homeRoom.name, creepsInRole.length);
		_.each(creepsInRole, function(c: Creep){
			if (!c.spawning) {
				if (!sq.wait) {
					c.memory.squadComplete = true;
				}
				let role: WarfareCreepAction = new squadRole.role();
				role.setCreep(<Creep> c, targetPositions);
				role.wait = wait;
				role.squad = creeps;
				role.squadSize = squadSize;
				role.setGovernor(governor);
				role.action();
				if (c.ticksToLive < 150 && (creepsInRole.length === squadRole.maxCreeps)) {
					// Do a preemptive spawn if this creep is about to expire.
					homeSpawn = homeRoom.find<Spawn>(FIND_MY_SPAWNS)[0];
					let status = createCreep(homeSpawn, governor.getCreepConfig());
					if (_.isNumber(status)) {
						console.log("manageSquad.preempt-spawn", Config.translateErrorCode(status), JSON.stringify(squadRole.governor.ROLE));
					} else {
						console.log("manageSquad.preempt-spawn", status, JSON.stringify(squadRole.governor.ROLE));
					}
				}
			}
		}, this);
		if (creepsInRole.length < squadRole.maxCreeps) {
			homeSpawn = homeRoom.find<Spawn>(FIND_MY_SPAWNS)[0];
			let status = createCreep(homeSpawn, governor.getCreepConfig());
			if (_.isNumber(status)) {
				console.log("manageSquad.spawn", Config.translateErrorCode(status), JSON.stringify(squadRole.governor.ROLE));
			} else {
				console.log("manageSquad.spawn", status, JSON.stringify(squadRole.governor.ROLE));
			}
		}
	}, this);
}

export function govern(): void {
	setup();
	_.each(Memory.offense.targets, function(roomName) {
		if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
			config = getConfigForRemoteTarget(roomName);
			homeRoom = Game.rooms[config.homeRoom];
			homeSpawn = homeRoom.find<Spawn>(FIND_MY_SPAWNS)[0];
			targetRoom = Game.rooms[roomName];
			switch (roomName) {
				case "W5N43":
					manageSquad(roomName, artilleryConfig, assaultPositions);
					break;
				case "W4N42":
					manageSquad(roomName, assaultConfig, assaultPositions);
					break;
				case "W3N41":
					manageSquad(roomName, sqibConfig, schmoopPositions);
					break;
				case "W4N43":
					manageSquad(roomName, sqibConfig, positions);
					break;
				default:
					manageSquad(roomName, squadConfig, positions);
			}
			let vision: boolean = false;
			if (!!targetRoom) {
				// We have vision of the room, that's good.
				vision = true;
				targetRoom.addProperties();
				let hostiles = targetRoom.find(FIND_HOSTILE_CREEPS);
				let towers = targetRoom.find(FIND_HOSTILE_STRUCTURES, {
					filter: (s: Structure) => s.structureType === STRUCTURE_TOWER,
				});
				let energyInTowers: number = 0;
				if (towers.length > 0) {
					energyInTowers = towers.reduce<number>(function(result: number, n: StructureTower): number {
						result += n.energy;
						return result;
					}, energyInTowers);
				}
				console.log(`AssaultRoom ${roomName} has ${targetRoom.energyInContainers} energy in containers, `
					+ `${hostiles.length} hostiles and ${towers.length} towers with ${energyInTowers} energy.`);
			}
		}
	}, this);
}
