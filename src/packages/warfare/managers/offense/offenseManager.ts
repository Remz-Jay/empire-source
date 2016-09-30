import WarfareCreepAction from "../../warfareCreepAction";
import FasterminatorGovernor from "../../governors/fasterminator";
import Terminator from "../../roles/terminator";

import WarvesterGovernor from "../../governors/warvester";
import Warvester from "../../roles/warvester";

import HealerGovernor from "../../governors/healer";
import Healer from "../../roles/healer";
import DismantlerGovernor from "../../governors/dismantler";
import Dismantler from "../../roles/dismantler";
import WarArcherGovernor from "../../governors/wararcher";
import WarArcher from "../../roles/wararcher";
import WarriorGovernor from "../../governors/warrior";
import Warrior from "../../roles/warrior";
import WarMuleGovernor from "../../governors/warmule";
import WarMule from "../../roles/warmule";
import WarUpgraderGovernor from "../../governors/warupgrader";
import WarUpgrader from "../../roles/warupgrader";
// import WarBuilderGovernor from "../../governors/warbuilder";
// import WarBuilder from "../../roles/warbuilder";

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

let W2N46Positions: RoomPosition[] = [
	new RoomPosition(24, 37, "W5N44"),
	new RoomPosition(22, 9, "W5N44"),
	new RoomPosition(30, 43, "W5N45"),
	new RoomPosition(45, 35, "W5N45"),
	new RoomPosition(22, 15, "W4N45"),
	new RoomPosition(33, 5, "W4N45"),
	new RoomPosition(25, 46, "W4N46"),
	new RoomPosition(25, 36, "W4N46"),
	new RoomPosition(47, 22, "W4N46"),
	new RoomPosition(43, 13, "W3N46"),
	new RoomPosition(3, 11, "W2N46"),
];
let W9N48Positions: RoomPosition[] = [
	new RoomPosition(16, 1, "W9N47"),
	new RoomPosition(16, 47, "W9N48"),
	new RoomPosition(23, 27, "W9N48"),
	new RoomPosition(27, 19, "W9N48"),
];
let W9N49Positions: RoomPosition[] = [
	new RoomPosition(30, 7, "W9N45"),
	new RoomPosition(6, 2, "W8N46"),
	new RoomPosition(18, 2, "W8N47"),
	new RoomPosition(8, 8, "W8N48"),
	new RoomPosition(12, 46, "W8N49"),
	new RoomPosition(20, 31, "W7N49"),
];
let W9N49Positions2: RoomPosition[] = [
	new RoomPosition(27, 16, "W7N43"),
].concat(W9N49Positions);

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
let W7N47Positions: RoomPosition[] =
	W7N46Positions.concat([
		new RoomPosition(35, 2, "W7N47"),
		new RoomPosition(34, 47, "W7N48"),
		new RoomPosition(3, 11, "W8N48"),
		new RoomPosition(46, 17, "W6N49"),
		new RoomPosition(14, 47, "W3N49"),
		new RoomPosition(28, 12, "W3N49"),
	]);

let powerSquad = {
	roles: [
		{
			"governor": WarriorGovernor,
			"role": Warrior,
			"maxCreeps": 0,
		},
		{
			"governor": HealerGovernor,
			"role": Healer,
			"maxCreeps": 0,
		},
		{
			"governor": WarMuleGovernor,
			"role": WarMule,
			"maxCreeps": 0,
		},
	],
	wait: false,
};

let claimSquad = {
	roles: [
		{
			"governor": WarUpgraderGovernor,
			"role": WarUpgrader,
			"maxCreeps": 0,
		},
	],
	wait: false,
};

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
let warArcherConfig = {
	roles: [
		{
			"governor": WarArcherGovernor,
			"role": WarArcher,
			"maxCreeps": 0,
		},
	],
	wait: false,
};
let healTestConfig = {
	roles: [
		{
			"governor": WarArcherGovernor,
			"role": WarArcher,
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
let warvestConfig = {
	roles: [
		{
			"governor": WarvesterGovernor,
			"role": Warvester,
			"maxCreeps": 2,
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
let boo: RoomPosition[] = [
	new RoomPosition(2, 37, "W7N43"),
	new RoomPosition(41, 47, "W8N43"),
	new RoomPosition(18, 28, "W8N42"),
];
let warvestPositions: RoomPosition[] = [
	new RoomPosition(1, 3, "W6N45"),
	new RoomPosition(23, 3, "W6N45"),
	new RoomPosition(33, 2, "W6N45"),
	new RoomPosition(47, 2, "W6N45"),
	new RoomPosition(7, 9, "W5N45"),
	new RoomPosition(10, 17, "W5N45"), // X Source
	new RoomPosition(7, 9, "W5N45"),
	new RoomPosition(47, 2, "W6N45"),
	new RoomPosition(33, 2, "W6N45"),
	new RoomPosition(23, 3, "W6N45"),
	new RoomPosition(1, 3, "W6N45"),
	new RoomPosition(24, 21, "W7N45"), // Terminal
];

let positions: RoomPosition[] = [
	new RoomPosition(14, 2, "W3N42"),
	new RoomPosition(14, 43, "W3N43"),
	new RoomPosition(2, 41, "W4N43"),
	new RoomPosition(47, 41, "W5N43"),
	new RoomPosition(30, 38, "W5N43"),
	new RoomPosition(7, 8, "W5N42"),
].reverse();

let powerPositions: RoomPosition[] = [
	new RoomPosition(30, 21, "W6N40"),
];

let W15N41Positions: RoomPosition[] = [
	new RoomPosition(2, 16, "W10N40"),
	new RoomPosition(27, 7, "W15N40"),
	new RoomPosition(42, 8, "W15N41"),
	new RoomPosition(43, 3, "W13N41"),
];
let W12N43Positions: RoomPosition[] = [
	new RoomPosition(47, 43, "W11N44"),
	new RoomPosition(6, 7, "W11N43"),
	new RoomPosition(47, 9, "W12N43"),
	new RoomPosition(30, 47, "W12N43"),
	new RoomPosition(47, 9, "W12N43"),
	new RoomPosition(3, 31, "W12N42"),
	new RoomPosition(35, 34, "W13N42"),
	new RoomPosition(25, 35, "W13N42"),
	new RoomPosition(4, 3, "W13N42"),
	new RoomPosition(19, 40, "W13N43"),
	new RoomPosition(44, 35, "W13N44"),
	new RoomPosition(3, 35, "W12N44"),
];

let W4N49Positions: RoomPosition[] = [
	new RoomPosition(2, 26, "W4N49"),
	new RoomPosition(21, 48, "W4N49"),
	new RoomPosition(7, 47, "W4N48"),
	new RoomPosition(7, 2, "W4N47"),
	new RoomPosition(14, 46, "W3N49"),
	new RoomPosition(2, 5, "W2N48"),
];
export function setup() {
	initMemory();
	global.offense = {
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
	_.each(sq.roles, function(squadRole) {
		let governor = new squadRole.governor(homeRoom, config);
		let creepsInRole = _.filter(creeps, (c: Creep) => c.memory.role === squadRole.governor.ROLE);
		console.log(squadRole.governor.ROLE, squadRole.maxCreeps, targetRoomName, homeRoom.name, creepsInRole.length);
		_.each(creepsInRole, function(c: Creep){
			if (!c.spawning) {
				let b = Game.cpu.getUsed();
				let role: WarfareCreepAction = new squadRole.role();
				role.setCreep(<Creep> c, targetPositions);
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
						console.log("manageSquad.preempt-spawn", global.translateErrorCode(status), squadRole.governor.ROLE);
					} else {
						console.log("manageSquad.preempt-spawn", status, squadRole.governor.ROLE);
					}
				}
				let a = Game.cpu.getUsed() - b;
				if (a > 2) {
					console.log(global.colorWrap(`Creep ${c.name} (${c.memory.role} in ${c.room.name}) took ${_.round(a, 2)} to run.`, "Red"));
				}
			}
		}, this);
		if (creepsInRole.length < squadRole.maxCreeps) {
			let status = createCreep(governor.getCreepConfig());
			if (_.isNumber(status)) {
				console.log("manageSquad.spawn", global.translateErrorCode(status), squadRole.governor.ROLE);
			} else {
				console.log("manageSquad.spawn", status, squadRole.governor.ROLE);
			}
		}
	}, this);
}

export function govern(): void {
	_.each(Memory.offense.targets, function(roomName) {
		if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
			config = getConfigForRemoteTarget(roomName);
			homeRoom = Game.rooms[config.homeRoom];
			targetRoom = Game.rooms[roomName];
			switch (roomName) {
				case "W8N42":
					manageSquad(roomName, squadConfig, boo);
					break;
				case "W5N45":
					manageSquad(roomName, warvestConfig, warvestPositions);
					break;
				case "W9N49": // Tharit 7 left
					manageSquad(roomName, warArcherConfig, W9N49Positions2);
					break;
				case "W2N46": // Drowsy X
					manageSquad(roomName, claimSquad, W2N46Positions);
					break;
				case "W9N48":
					manageSquad(roomName, warArcherConfig, W9N48Positions);
					break;
				case "W7N47":
					manageSquad(roomName, healTestConfig, W7N47Positions);
					break;
				case "W7N48":
					manageSquad(roomName, warArcherConfig, W7N47Positions);
					break;
				case "W15N41": // SirLovi south
					manageSquad(roomName, warArcherConfig, W15N41Positions);
					break;
				case "W12N43": // SirLovi East
					manageSquad(roomName, healTestConfig, W12N43Positions);
					break;
				case "W4N49":
					manageSquad(roomName, healTestConfig, W4N49Positions);
					break;
				case "W5N42":
				case "W6N42":
				case "W7N44":
				case "W7N45":
					manageSquad(roomName, defenderConfig, undefined);
					break;
				case "W6N40":
					let powerFlagName = "P";
					let powerFlag = Game.flags[powerFlagName];
					if (!!powerFlag) {
						powerPositions = [powerFlag.pos];
					}
					manageSquad(roomName, powerSquad, powerPositions);
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
			}
		}
	}, this);
}
