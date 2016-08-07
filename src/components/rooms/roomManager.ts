import * as Config from "./../../config/config";
import * as CreepManager from "./../creeps/creepManager";
import * as SpawnManager from "./../spawns/spawnManager";
import * as SourceManager from "./../sources/sourceManager";

export let rooms: { [roomName: string]: Room };
export let costMatrices: { [roomName: string]: CostMatrix };
export let roomNames: string[] = [];

export function loadRooms() {
	rooms = Game.rooms;
	costMatrices = {};
	_loadRoomNames();

	if (Config.VERBOSE) {
		let count = _.size(rooms);
		console.log(count + " rooms found.");
	}
}

export function getFirstRoom(): Room {
	return rooms[roomNames[0]];
}

export function getRoomByName(roomName: string): Room {
	return (rooms.hasOwnProperty(roomName)) ? rooms[roomName] : undefined;
}

function _loadRoomNames() {
	for (let roomName in rooms) {
		if (rooms.hasOwnProperty(roomName)) {
			roomNames.push(roomName);
		}
	}
}

export function governRooms(): void {
	for (let roomName in rooms) {
		let room = rooms[roomName];
		let myStructures = room.find(FIND_MY_STRUCTURES);
		SpawnManager.load(room);
		SourceManager.load(room);

		room.addProperties();
		// TODO: Walls and Ramparts
		// console.log(roomName, room.containers, room.containerCapacityAvailable , room.energyInContainers , room.energyPercentage);

		let towers = _.filter(myStructures, (s: Structure) => s.structureType === STRUCTURE_TOWER);
		_.each(towers, function(t: StructureTower) {
			t.run();
		}, this);

		if (!!room.storage) {
			let links = _.filter(myStructures, (s: Structure) => s.structureType === STRUCTURE_LINK);
			_.each(links, function(l: StructureLink) {
				l.run();
			}, this);
		}

		// TODO: Sources and HarvesterPreference


		if (room.controller.level > 0 && room.controller.my) {
			// this is one of our controlled rooms
			console.log(`Room ${room.name} has ${room.energyAvailable}/${room.energyCapacityAvailable} energy and ` +
				`${room.energyInContainers}/${room.containerCapacityAvailable} (${room.energyPercentage}%) in storage.` +
				` (RCL=${room.controller.level} @ ${_.floor(room.controller.progress / (room.controller.progressTotal / 100))}%)`
			);
		}

		// run the creeps in this room
		CreepManager.governCreeps(room);
	}
}
