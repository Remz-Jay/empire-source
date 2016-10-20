import WarfareCreepAction from "../../warfareCreepAction";
import Terminator from "../../roles/terminator";
import Warvester from "../../roles/warvester";

/*
import Healer from "../../roles/healer";
import Dismantler from "../../roles/dismantler";
import WarArcher from "../../roles/wararcher";
import Warrior from "../../roles/warrior";
import WarMule from "../../roles/warmule";
import WarUpgrader from "../../roles/warupgrader";*/
// import WarBuilder from "../../roles/warbuilder";

const roles: {[id: string]: any } = {
	Terminator: Terminator,
	Warvester: Warvester,
};

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

/*const claimSquad = {
	roles: [
		{
			"role": WarUpgrader,
			"maxCreeps": 0,
		},
	],
	wait: false,
};*/

const defenderConfig: SquadConfig = {
	roles: [
		{
			"role": "Terminator",
			"maxCreeps": 3,
		},
	],
	wait: false,
};
/*const warArcherConfig = {
	roles: [
		{
			"role": WarArcher,
			"maxCreeps": 0,
		},
	],
	wait: false,
};
const healTestConfig = {
	roles: [
		{
			"role": WarArcher,
			"maxCreeps": 0,
		},
		{
			"role": Healer,
			"maxCreeps": 1,
		},
		{
			"role": Dismantler,
			"maxCreeps": 1,
		},
	],
	wait: false,
};*/
const warvestConfig: SquadConfig = {
	roles: [
		{
			"role": "Warvester",
			"maxCreeps": 2,
		},
	],
	wait: false,
};
const squadConfig: SquadConfig = {
	roles: [
		{
			"role": "Terminator",
			"maxCreeps": 1,
		},
	],
	wait: false,
};
const warvestPositions: RoomPosition[] = [
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

const positions: RoomPosition[] = [
	new RoomPosition(14, 2, "W3N42"),
	new RoomPosition(14, 43, "W3N43"),
	new RoomPosition(2, 41, "W4N43"),
	new RoomPosition(47, 41, "W5N43"),
	new RoomPosition(30, 38, "W5N43"),
	new RoomPosition(7, 8, "W5N42"),
].reverse();

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
			const parsed: any = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
			const isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
			const username = _.get(
				_.find(Game.structures, (s) => true), "owner.username",
				_.get(_.find(Game.creeps, (s) => true), "owner.username")
			) as string;
			const isMyRoom = Game.rooms[roomName] &&
				Game.rooms[roomName].controller &&
				Game.rooms[roomName].controller.my;
			const isMyReservedRoom = Game.rooms[roomName] &&
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
			const route = findRoute(homeRoomName, remoteRoomName);
			if (!_.isNumber(route) && route.length < distance) {
				distance = route.length;
				optimalRoute = route;
				target = homeRoomName;
			}
		} else {
			for (const room in Game.rooms) {
				if (room !== remoteRoomName) {
					const route = findRoute(room, remoteRoomName);
					if (!_.isNumber(route) && route.length < distance) {
						distance = route.length;
						optimalRoute = route;
						target = room;
					}
				}
			}
		}
		const roomConfig: RemoteRoomConfig = {
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
	const spawn = homeRoom.getFreeSpawn();
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
		creeps = creeps.concat(_.filter(_.get(global.tickCache.rolesByRoom, `${role.ROLE}.${homeRoom.name}`, []),
			(c: Creep) => c.memory.config.targetRoom === targetRoomName
		));
	}, this);
	return creeps;
}
function manageSquad(targetRoomName: string, sq: SquadConfig, targetPositions: RoomPosition[]) {
	const resetIterator = false;
	const creeps = _.groupBy(loadCreeps(targetRoomName, sq), "memory.role");
	_.each(sq.roles, function(squadRole) {
		const ctor: any = roles[squadRole.role];
		ctor.setConfig(config);
		const creepsInRole = _.get(creeps, `${ctor.ROLE}`, []);
		console.log(ctor.ROLE, squadRole.maxCreeps, targetRoomName, homeRoom.name, creepsInRole.length);
		const role: WarfareCreepAction = new ctor();
		_.each(creepsInRole, function(c: Creep){
			if (!c.spawning) {
				role.setCreep(<Creep> c, targetPositions);
				if (resetIterator) {
					c.memory.positionIterator = 0;
				}
				role.action();
				if (c.ticksToLive < 200 && (creepsInRole.length === squadRole.maxCreeps)) {
					// Do a preemptive spawn if this creep is about to expire.
					const status = createCreep(ctor.getCreepConfig(homeRoom));
					if (_.isNumber(status)) {
						console.log("manageSquad.preempt-spawn", global.translateErrorCode(status), ctor.ROLE);
					} else {
						console.log("manageSquad.preempt-spawn", status, ctor.ROLE);
					}
				}
			}
		}, this);
		if (creepsInRole.length < squadRole.maxCreeps) {
			const status = createCreep(ctor.getCreepConfig(homeRoom));
			if (_.isNumber(status)) {
				console.log("manageSquad.spawn", global.translateErrorCode(status), ctor.ROLE);
			} else {
				console.log("manageSquad.spawn", status, ctor.ROLE);
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
				case "W5N45":
					manageSquad(roomName, warvestConfig, warvestPositions);
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
			if (!!targetRoom) {
				// We have vision of the room, that's good.
				const hostiles = targetRoom.hostileCreeps;
				const towers = targetRoom.hostileStructures.filter((s: Structure) => s.structureType === STRUCTURE_TOWER);
				let energyInTowers: number = 0;
				if (towers.length > 0) {
					energyInTowers = towers.reduce<number>(function(result: number, n: StructureTower): number {
						result = result + n.energy;
						return result;
					}, energyInTowers);
				}
				console.log(`AssaultRoom ${roomName} has ${targetRoom.energyInContainers} energy in containers, `
					+ `${hostiles.length} hostiles and ${towers.length} towers with ${energyInTowers} energy.`);
			}
		}
	}, this);
}
