import * as Config from "../../../../config/config";
import WarfareCreepAction from "../../warfareCreepAction";
/*import WarriorGovernor from "../../governors/warrior";
import RangerGovernor from "../../governors/ranger";
import HealerGovernor from "../../governors/healer";
import Warrior from "../../roles/warrior";
import Ranger from "../../roles/ranger";
import Healer from "../../roles/healer";*/
import TerminatorGovernor from "../../governors/terminator";
import Terminator from "../../roles/terminator";

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
			"governor": TerminatorGovernor,
			"role": Terminator,
			"maxCreeps": 1,
		},
	],
};

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
		add(roomName: string) {
			if (!_.isNaN(Game.map.getRoomLinearDistance("W1N1", roomName))) {
				Memory.offense.targets.push(roomName);
				console.log(`Added ${roomName} for Assault.`);
			} else {
				console.log(`Room ${roomName} does not exist.`);
			}
		},
		remove(roomName: string) {
			Memory.offense.targets = _.pull(Memory.offense.targets, roomName);
			console.log(`Removed ${roomName} from the Assault targets.`);
		},
	};
}
function getConfigForRemoteTarget(remoteRoomName: string): RemoteRoomConfig {
	if (!!Memory.offense.config[remoteRoomName]) {
		return Memory.offense.config[remoteRoomName];
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
				console.log(`Unable to create ${creepConfig.properties.role} Creep (${status})`);
			} else {
				console.log(`Started creating new ${creepConfig.properties.role} Creep ${status}`);
			}
		}
	}
	return status;
}
function loadCreeps(targetRoomName: string): Creep[] {
	let creeps: Creep[] = [];
	_.each(squadConfig.roles, function(role) {
		creeps = creeps.concat(_.filter(Game.creeps, (c: Creep) =>
			c.memory.role === role.governor.ROLE
			&& c.memory.homeRoom === homeRoom.name
			&& c.memory.config.targetRoom === targetRoomName
			&& !c.spawning,
		));
	}, this);
	return creeps;
}
function manageSquad(targetRoomName: string) {
	let creeps = loadCreeps(targetRoomName);
	// TODO: Make the squad wait for the last spawning member.
	let squadSize = _.sum(squadConfig.roles, "maxCreeps");
	let wait: boolean = false;
	if (creeps.length < squadSize) {
		wait = true;
	}
	_.each(squadConfig.roles, function(squadRole) {
		let governor = new squadRole.governor(homeRoom, homeSpawn, config);
		let creepsInRole = _.filter(creeps, (c: Creep) => c.memory.role === squadRole.governor.ROLE);
		console.log(squadRole.governor.ROLE, squadRole.maxCreeps, targetRoomName, homeRoom.name, creepsInRole.length);
		_.each(creepsInRole, function(c: Creep){
			if (!c.spawning) {
				let role: WarfareCreepAction = new squadRole.role();
				role.setCreep(<Creep> c);
				role.wait = wait;
				role.squad = creeps;
				role.squadSize = squadSize;
				role.setGovernor(governor);
				role.action();
			}
		}, this);
		if (creepsInRole.length < squadRole.maxCreeps) {
			homeSpawn = homeRoom.find<Spawn>(FIND_MY_SPAWNS)[0];
			createCreep(homeSpawn, governor.getCreepConfig());
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
			manageSquad(roomName);
			let vision: boolean = false;
			if (!!targetRoom) {
				// We have vision of the room, that's good.
				vision = true;
				targetRoom.addProperties();
				let hostiles = targetRoom.find(FIND_HOSTILE_CREEPS);
				console.log(`AssaultRoom ${roomName} has ${JSON.stringify(vision)} vision and ${hostiles.length} hostiles.`);
			}
		}
	}, this);
}
