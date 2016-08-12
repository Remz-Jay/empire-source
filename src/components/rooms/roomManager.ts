import * as Config from "./../../config/config";
import * as CreepManager from "./../creeps/creepManager";
import * as SpawnManager from "./../spawns/spawnManager";
import * as SourceManager from "./../sources/sourceManager";
import * as WallManager from "../walls/wallManager";
import * as RampartManager from "../ramparts/rampartManager";
import * as StatsManager from "../../shared/statsManager";

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
	let CpuRoomInit = 0;
	let CpuTowers = 0;
	let CpuLinks = 0;
	let CpuRoles = 0;
	let CpuCreeps = 0;
	for (let roomName in rooms) {
		let CpuBeforeRoomInit = Game.cpu.getUsed();
		let room = rooms[roomName];
		if (!!room.controller && room.controller.level > 0 && room.controller.my) {
			room.addProperties();
			let myStructures = room.find(FIND_MY_STRUCTURES);
			WallManager.load(room);
			WallManager.adjustStrength();
			RampartManager.load(room);
			RampartManager.adjustStrength();
			SpawnManager.load(room);
			SourceManager.load(room);
			SourceManager.updateHarvesterPreference();
			if (room.controller.level > 1 && room.numberOfCreeps < 5) {
				Game.notify(`Number of creeps in room ${room.name} dropped to ${room.numberOfCreeps}`);
			}
			if (room.controller.level > 0 && room.controller.my) {
				// this is one of our controlled rooms
				console.log(`Room ${room.name} has ${room.energyAvailable}/${room.energyCapacityAvailable} energy and ` +
					`${room.energyInContainers}/${room.containerCapacityAvailable} (${room.energyPercentage}%) in storage.` +
					` (RCL=${room.controller.level} @ ${_.floor(room.controller.progress / (room.controller.progressTotal / 100))}%)`
				);
			}
			CpuRoomInit += (Game.cpu.getUsed() - CpuBeforeRoomInit);

			let CpuBeforeTowers = Game.cpu.getUsed();
			let towers = _.filter(myStructures, (s: Structure) => s.structureType === STRUCTURE_TOWER);
			_.each(towers, function(t: StructureTower) {
				t.run();
			}, this);
			CpuTowers += (Game.cpu.getUsed() - CpuBeforeTowers);

			let CpuBeforeLinks = Game.cpu.getUsed();
			if (!!room.storage) {
				let links = _.filter(myStructures, (s: Structure) => s.structureType === STRUCTURE_LINK);
				_.each(links, function(l: StructureLink) {
					l.run();
				}, this);
			}
			CpuLinks += (Game.cpu.getUsed() - CpuBeforeLinks);

			// run the creeps in this room
			let statObject: CreepStats = CreepManager.governCreeps(room);
			CpuRoles += statObject.roles;
			CpuCreeps += statObject.creeps;
		}
	}
	StatsManager.addStat("cpu.roominit", CpuRoomInit);
	StatsManager.addStat("cpu.towers", CpuTowers);
	StatsManager.addStat("cpu.links", CpuLinks);
	StatsManager.addStat("cpu.roles", CpuRoles);
	StatsManager.addStat("cpu.creeps", CpuCreeps);
}
