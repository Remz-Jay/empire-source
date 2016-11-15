import WarfareCreepAction from "../../warfareCreepAction";
import Terminator from "../../roles/terminator";
import Warvester from "../../roles/warvester";
import Healer from "../../roles/healer";
import Dismantler from "../../roles/dismantler";
import WarArcher from "../../roles/wararcher";
import WarMule from "../../roles/warmule";
import WarClaimer from "../../roles/warclaimer";
import WarBuilder from "../../roles/warbuilder";
import WarUpgrader from "../../roles/warupgrader";
import Sentinel from "../../roles/sentinel";

const roles: {[id: string]: any } = {
	Terminator: Terminator,
	Warvester: Warvester,
	Healer: Healer,
	Dismantler: Dismantler,
	WarArcher: WarArcher,
	WarMule: WarMule,
	WarClaimer: WarClaimer,
	WarBuilder: WarBuilder,
	WarUpgrader: WarUpgrader,
	Sentinel: Sentinel,
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
*/
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
			const isMyRoom = Game.rooms[roomName] && Game.rooms[roomName].my;
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
		if (!_.isString(homeRoomName)) {
			homeRoomName = "W6N42";
		}
		const roomConfig: RemoteRoomConfig = {
			homeRoom: homeRoomName,
			targetRoom: remoteRoomName,
			homeDistance: 1,
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
	_.forEach(sq.roles, function(role: SquadRole) {
		creeps = creeps.concat(_.filter(_.get(global.tickCache.rolesByRoom, `${role.role}.${homeRoom.name}`, []),
			(c: Creep) => c.memory.config.targetRoom === targetRoomName
		));
	});
	return creeps;
}
function manageSquad(targetRoomName: string, sq: SquadConfig, targetPositions: RoomPosition[]) {
	console.log(`Squad with target room ${targetRoomName} has the following positions:`);
	targetPositions.forEach((p: RoomPosition) => console.log(p));
	const resetIterator = false;
	const creeps = _.groupBy(loadCreeps(targetRoomName, sq), "memory.role");
	_.each(sq.roles, function(squadRole: SquadRole) {
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

const healTestConfig = {
	roles: [
		{
			"role": "WarArcher",
			"maxCreeps": 0,
		},
		{
			"role": "Healer",
			"maxCreeps": 0,
		},
		{
			"role": "Dismantler",
			"maxCreeps": 0,
		},
	],
	wait: false,
};
const claimConf = {
	roles: [
		{
			"role": "WarUpgrader",
			"maxCreeps": 1,
		},
		{
			"role": "WarBuilder",
			"maxCreeps": 0,
		},
		{
			"role": "Sentinel",
			"maxCreeps": 1,
		},
	],
	wait: false,
}
export function govern(): void {
	Memory.offense.targets.forEach((roomName: string) => {
		if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
			config = getConfigForRemoteTarget(roomName);
			homeRoom = Game.rooms[config.homeRoom];
			targetRoom = Game.rooms[roomName];
			switch (roomName) {
				case "E5S45":
					let SQPositions: RoomPosition[] = [];
					let SquadFlags: Flag[] = [];
					let f = _(Game.flags).filter((f: Flag) => f.name.startsWith("SA_")).sortBy("name").value();
					console.log(f.length);
					f.forEach((f: Flag) => {
						console.log(f.name, f.pos);
						SQPositions.push(f.pos);
						SquadFlags.push(f);
					});
					manageSquad(roomName, healTestConfig, SQPositions);
					break;
				case "E7S46":
					let SQPositions2: RoomPosition[] = [];
					let SquadFlags2: Flag[] = [];
					let f2 = _(Game.flags).filter((f: Flag) => f.name.startsWith("SQ_")).sortBy("name").value();
					console.log(f2.length);
					f2.forEach((f: Flag) => {
						console.log(f.name, f.pos);
						SQPositions2.push(f.pos);
						SquadFlags2.push(f);
					});
					manageSquad(roomName, claimConf, SQPositions2);
					break;
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
		}
	});
}
