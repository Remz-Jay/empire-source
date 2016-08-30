import * as StatsManager from "../../../../shared/statsManager";
import * as RoomManager from "../../../../components/rooms/roomManager";

import WarfareCreepAction from "../../warfareCreepAction";

import SentinelGovernor from "../../governors/sentinel";
import FasterminatorGovernor from "../../governors/fasterminator";
import Terminator from "../../roles/terminator";

import WarvesterGovernor from "../../governors/warvester";
import Warvester from "../../roles/warvester";

import HealerGovernor from "../../governors/healer";
import Healer from "../../roles/healer";
import DismantlerGovernor from "../../governors/dismantler";
import Dismantler from "../../roles/dismantler";

/*import FastankGovernor from "../../governors/fastank";
import TankGovernor from "../../governors/tank";
import Tank from "../../roles/tank";

import DismantlerGovernor from "../../governors/dismantler";
import Dismantler from "../../roles/dismantler";

import WarriorGovernor from "../../governors/warrior";
import RangerGovernor from "../../governors/ranger";
import HealerGovernor from "../../governors/healer";
import Warrior from "../../roles/warrior";
import Ranger from "../../roles/ranger";
import Healer from "../../roles/healer";
import TerminatorGovernor from "../../governors/terminator";

import ScoutGovernor from "../../governors/scout";
import Scout from "../../roles/scout";*/

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
let targetRoom: Room;

let satelliteConfig = {
	roles: [
		{
			"governor": SentinelGovernor,
			"role": Terminator,
			"maxCreeps": 1,
		},
	],
	wait: false,
};

let dismantleConfig = {
	roles: [
		{
			"governor": SentinelGovernor,
			"role": Terminator,
			"maxCreeps": 0,
		},
		{
			"governor": DismantlerGovernor,
			"role": Dismantler,
			"maxCreeps": 0,
		},
	],
	wait: false,
}


let W9N45Positions: RoomPosition[] = [
	new RoomPosition(35, 6, "W8N44"),
	new RoomPosition(1, 9, "W8N45"),
	new RoomPosition(47, 9, "W9N45"),
	new RoomPosition(42, 19, "W9N45"),

	new RoomPosition(46, 39, "W9N46"),
	new RoomPosition(12, 33, "W8N46"),
	new RoomPosition(6, 2, "W8N46"),
	new RoomPosition(6, 47, "W8N47"),

	new RoomPosition(24, 39, "W8N47"),
	new RoomPosition(48, 13, "W8N47"),
	new RoomPosition(4, 13, "W7N47"),

	new RoomPosition(19, 23, "W7N47"),
	new RoomPosition(23, 30, "W7N47"),
	new RoomPosition(38, 25, "W7N47"),
	new RoomPosition(36, 25, "W7N47"),
	new RoomPosition(17, 2, "W8N47"),
	new RoomPosition(17, 2, "W8N47"), //16
	new RoomPosition(16, 47, "W8N48"),
	// new RoomPosition(15, 17, "W7N47"),
];

let W9N43Positions: RoomPosition[] = [
	new RoomPosition(45, 16, "W9N43"),
];
let W9N44Positions: RoomPosition[] = [
	new RoomPosition(34, 23, "W7N43"),
	new RoomPosition(35, 6, "W8N44"),
	new RoomPosition(45, 14, "W9N44"),
	new RoomPosition(42, 19, "W9N45"),
	new RoomPosition(46, 39, "W9N46"),
	new RoomPosition(12, 33, "W8N46"),
	new RoomPosition(6, 2, "W8N46"),
	new RoomPosition(6, 47, "W8N47"),
];
let W8N45Positions: RoomPosition[] = [
	new RoomPosition(34, 23, "W7N43"),
	new RoomPosition(35, 6, "W8N44"),
	new RoomPosition(26, 25, "W8N45"),
	new RoomPosition(42, 19, "W9N45"),
	new RoomPosition(46, 39, "W9N46"),
	new RoomPosition(12, 33, "W8N46"),
	new RoomPosition(6, 2, "W8N46"),
	new RoomPosition(6, 47, "W8N47"),
];

let W7N46Positions: RoomPosition[] = [
	new RoomPosition(7, 2, "W6N44"),
	new RoomPosition(14, 20, "W6N45"),
	new RoomPosition(25, 14, "W6N45"),
	new RoomPosition(18, 1, "W6N45"),
	new RoomPosition(16, 41, "W6N46"),
	new RoomPosition(13, 25, "W6N46"),
	new RoomPosition(9, 26, "W6N46"),
	new RoomPosition(2, 28, "W6N46"),
	new RoomPosition(2, 22, "W6N46"),
	new RoomPosition(2, 18, "W6N46"),
	new RoomPosition(2, 14, "W6N46"),
	new RoomPosition(45, 10, "W7N46"),
];

let W8N46Positions: RoomPosition[] = W7N46Positions.concat([
	new RoomPosition(46, 18, "W8N46"),
]);

let defenderConfig = {
	roles: [
		{
			"governor": FasterminatorGovernor,
			"role": Terminator,
			"maxCreeps": 3,
		},
	],
	wait: false,
};

let bashConfig = {
	roles: [
		{
			"governor": FasterminatorGovernor,
			"role": Terminator,
			"maxCreeps": 0,
		},
		{
			"governor": HealerGovernor,
			"role": Healer,
			"maxCreeps": 0,
		},
		{
			"governor": DismantlerGovernor,
			"role": Dismantler,
			"maxCreeps": 0,
		},
	],
	wait: false,
};

let bashPositions: RoomPosition[] = [
	new RoomPosition(1, 36, "W7N43"),
	new RoomPosition(11, 1, "W8N43"),
	new RoomPosition(1, 35, "W8N44"),
	new RoomPosition(1, 7, "W9N44"),
	new RoomPosition(43, 1, "W10N44"),
	new RoomPosition(38, 12, "W10N49"),
	new RoomPosition(2, 29, "W9N49"),
];
let healTestConfig = {
	roles: [
		{
			"governor": HealerGovernor,
			"role": Healer,
			"maxCreeps": 0,
		},
		{
			"governor": DismantlerGovernor,
			"role": Dismantler,
			"maxCreeps": 0,
		},
	],
	wait: false,
};
let warvestConfig = {
	roles: [
		{
			"governor": WarvesterGovernor,
			"role": Warvester,
			"maxCreeps": 3,
		},
	],
	wait: false,
};
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
			"governor": FasterminatorGovernor,
			"role": Terminator,
			"maxCreeps": 0,
		},
	],
	wait: false,
};
let warvestPositions: RoomPosition[] = [
	new RoomPosition(48, 46, "W7N44"),
	new RoomPosition(19, 48, "W6N44"),
	new RoomPosition(48, 44, "W6N44"),
	new RoomPosition(2, 26, "W5N44"),
	new RoomPosition(22, 9, "W5N44"),
	new RoomPosition(12, 33, "W5N45"),
	new RoomPosition(10, 17, "W5N45"), // X Source
	new RoomPosition(12, 33, "W5N45"),
	new RoomPosition(22, 9, "W5N44"),
	new RoomPosition(2, 26, "W5N44"),
	new RoomPosition(48, 44, "W6N44"),
	new RoomPosition(19, 48, "W6N44"),
	new RoomPosition(48, 46, "W7N44"),
	new RoomPosition(31, 28, "W7N44"), // Terminal
];
let healTestPositions: RoomPosition[] = [
	new RoomPosition(30, 3, "W2N43"),
	new RoomPosition(29, 47, "W2N44"),
	new RoomPosition(39, 28, "W2N44"),
	new RoomPosition(14, 27, "W2N44"), // Rampart
	new RoomPosition(9, 25, "W2N44"), // Tower
	new RoomPosition(8, 20, "W2N44"), // Spawn
];
let helpPositions: RoomPosition[] = [
	new RoomPosition(47, 43, "W7N44"),
	new RoomPosition(9, 41, "W6N44"),

];
let schmoopPositions: RoomPosition[] = [
	new RoomPosition(33, 11, "W6N40"),
	new RoomPosition(40, 6, "W3N40"),
	new RoomPosition(6, 4, "W2N40"),
	new RoomPosition(2, 20, "W2N42"),
	new RoomPosition(9, 17, "W3N42"),
	new RoomPosition(10, 10, "W4N42"),
];
let assaultPositions: RoomPosition[] = [
	new RoomPosition(48, 17, "W7N42"),
];
let positions: RoomPosition[] = [
	new RoomPosition(14, 2, "W3N42"),
	new RoomPosition(14, 43, "W3N43"),
	new RoomPosition(2, 41, "W4N43"),
	new RoomPosition(47, 41, "W5N43"),
	new RoomPosition(30, 38, "W5N43"),
	new RoomPosition(7, 8, "W5N42"),
].reverse();

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

function createCreep(creepConfig: CreepConfiguration): string|number {
	let spawn = homeRoom.getFreeSpawn();
	let status: number | string = spawn.canCreateCreep(creepConfig.body, creepConfig.name);
	if (status === OK) {
		status = spawn.createCreepWhenIdle(creepConfig.body, creepConfig.name, creepConfig.properties);

		if (global.VERBOSE) {
			if (_.isNumber(status)) {
				console.log(`Unable to create ${creepConfig.properties.role} Creep (${global.translateErrorCode(status)})`);
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
		));
	}, this);
	return creeps;
}
function manageSquad(targetRoomName: string, sq: any, targetPositions: RoomPosition[]) {
	let resetIterator = false;
	let creeps = loadCreeps(targetRoomName, sq);
	// TODO: Make the squad wait for the last spawning member.
	let squadSize = _.sum(sq.roles, "maxCreeps");
	let wait: boolean = false;
	if (sq.wait && creeps.length < squadSize) {
		wait = true;
	}
	_.each(sq.roles, function(squadRole) {
		let governor = new squadRole.governor(homeRoom, config);
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
				if (resetIterator) {
					c.memory.positionIterator = 0;
				}
				role.setGovernor(governor);
				role.action();
				if (c.ticksToLive < 200 && (creepsInRole.length === squadRole.maxCreeps)) {
					// Do a preemptive spawn if this creep is about to expire.
					let status = createCreep(governor.getCreepConfig());
					if (_.isNumber(status)) {
						console.log("manageSquad.preempt-spawn", global.translateErrorCode(status), JSON.stringify(squadRole.governor.ROLE));
					} else {
						console.log("manageSquad.preempt-spawn", status, JSON.stringify(squadRole.governor.ROLE));
					}
				}
			}
		}, this);
		if (creepsInRole.length < squadRole.maxCreeps) {
			let status = createCreep(governor.getCreepConfig());
			if (_.isNumber(status)) {
				console.log("manageSquad.spawn", global.translateErrorCode(status), JSON.stringify(squadRole.governor.ROLE));
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
			homeRoom = RoomManager.getRoomByName(config.homeRoom);
			targetRoom = RoomManager.getRoomByName(roomName);
			switch (roomName) {
				case "W5N43": // Dummy for Kov Main secondary force
					manageSquad(roomName, sqibConfig, assaultPositions);
					break;
				case "W4N42": // Kov Main
					manageSquad(roomName, sqibConfig, assaultPositions);
					break;
				case "W3N42": // Kov Satellite
					manageSquad(roomName, sqibConfig, schmoopPositions);
					break;
				case "W6N44":
					manageSquad(roomName, artilleryConfig, helpPositions);
					break;
				case "W7N42":
					manageSquad(roomName, squadConfig, assaultPositions);
					break;
				case "W5N45":
					manageSquad(roomName, warvestConfig, warvestPositions);
					break;
				case "W2N44": // DrakeShady
					manageSquad(roomName, healTestConfig, healTestPositions);
					break;
				case "W9N44": // unverbraucht sat1
					manageSquad(roomName, satelliteConfig, W9N44Positions);
					break;
				case "W8N45": // unverbraucht sat2
					manageSquad(roomName, satelliteConfig, W8N45Positions);
					break;
				case "W7N46": // unverbraucht sat3
					manageSquad(roomName, satelliteConfig, W7N46Positions);
					break;
				case "W8N46": // unverbracht sat 4
					manageSquad(roomName, satelliteConfig, W8N46Positions);
					break;
				case "W9N43": // unverbraucht lowbie room
					manageSquad(roomName, dismantleConfig, W9N43Positions);
					break;
				case "W9N45": // unverbraucht bottom main
					manageSquad(roomName, healTestConfig, W9N45Positions);
					break;
				case "W9N49": // Tharit 7 left
					manageSquad(roomName, bashConfig, bashPositions);
					break;
				case "W5N42":
				case "W6N42":
				case "W7N44":
				case "W7N45":
					manageSquad(roomName, defenderConfig, undefined);
					break;

				default:
					manageSquad(roomName, squadConfig, positions);
			}
			let vision: boolean = false;
			if (!!targetRoom) {
				// We have vision of the room, that's good.
				vision = true;
				let hostiles = targetRoom.hostileCreeps;
				let towers = targetRoom.hostileStructures.filter((s: Structure) => s.structureType === STRUCTURE_TOWER);
				let energyInTowers: number = 0;
				if (towers.length > 0) {
					energyInTowers = towers.reduce<number>(function(result: number, n: StructureTower): number {
						result += n.energy;
						return result;
					}, energyInTowers);
				}
				console.log(`AssaultRoom ${roomName} has ${targetRoom.energyInContainers} energy in containers, `
					+ `${hostiles.length} hostiles and ${towers.length} towers with ${energyInTowers} energy.`);
				StatsManager.addStat(`offense.${roomName}.energy`, targetRoom.energyInContainers);
				StatsManager.addStat(`offense.${roomName}.hostiles`, hostiles.length);
				StatsManager.addStat(`offense.${roomName}.towerEnergy`, energyInTowers);
			}
		}
	}, this);
}
