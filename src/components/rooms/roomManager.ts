import * as CreepManager from "./../creeps/creepManager";
import * as SourceManager from "./../sources/sourceManager";
import * as WallManager from "../walls/wallManager";
import * as RampartManager from "../ramparts/rampartManager";
import * as StatsManager from "../../shared/statsManager";

export let rooms: { [roomName: string]: Room };
export let costMatrices: { [roomName: string]: CostMatrix };
export let roomNames: string[] = [];

export function loadRooms() {
	rooms = {};
	costMatrices = {};
	_.each(Game.rooms, function(r: Room) {
		r.addProperties();
		rooms[r.name] = r;
	});
	_loadRoomNames();

	if (global.VERBOSE) {
		let count = _.size(rooms);
		console.log(count + " rooms found.");
	}
}

export function getRoomByName(roomName: string): Room {
	if (rooms.hasOwnProperty(roomName))  {
		return rooms[roomName];
	} else if (!!Game.rooms[roomName]) {
		let r = Game.rooms[roomName];
		r.addProperties();
		rooms[r.name] = r;
		return r;
	}  else {
		return undefined;
	}
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
	let CpuLabs = 0;
	let allCreeps: any[] = [];
	for (let roomName in Game.rooms) {
		let CpuBeforeRoomInit = Game.cpu.getUsed();
		let room = getRoomByName(roomName);
		if (!!room && !!room.controller && room.controller.level > 0 && room.controller.my) {
			WallManager.load(room);
			WallManager.adjustStrength();
			RampartManager.load(room);
			RampartManager.adjustStrength();
			if (room.mySpawns.length > 0) {
				room.mySpawns.forEach(function (s: StructureSpawn) {
					if (!!s.spawning) {
						s.isBusy = true;
					} else {
						s.renewCreeps();
					}
				});
				SourceManager.load(room);
				SourceManager.updateHarvesterPreference();
			}

			if (room.controller.level > 1 && room.numberOfCreeps < 5) {
				Game.notify(`Number of creeps in room ${room.name} dropped to ${room.numberOfCreeps}`);
			}
			if (global.ROOMSTATS) {
				// this is one of our controlled rooms
				console.log(`Room ${room.name} has ${room.energyAvailable}/${room.energyCapacityAvailable} energy and ` +
					`${room.energyInContainers}/${room.containerCapacityAvailable} (${room.energyPercentage}%) in storage.` +
					` (RCL=${room.controller.level} @ ${_.floor(room.controller.progress / (room.controller.progressTotal / 100))}%)`
				);
			}
			if (room.hostileCreeps.length > 0 && room.hostileCreeps[0].owner.username === "Tharit") {
				if (!Memory.offense.config[room.name]) {
					let sourceRoom: string;
					switch (room.name) {
						case "W7N44":
						case "W7N45":
							sourceRoom = "W7N44";
							break;
						case "W6N45":
						case "W5N45":
							sourceRoom = "W6N45";
							break;
						default:
							sourceRoom = "W7N44";
					}
					Game.offense.add(room.name, sourceRoom);
					Game.notify(`Better wake up, ${room.name} is under attack by Tharit.`);
				}
			}
			CpuRoomInit += (Game.cpu.getUsed() - CpuBeforeRoomInit);

			let CpuBeforeTowers = Game.cpu.getUsed();
			let towers = _.filter(room.myStructures, (s: Structure) => s.structureType === STRUCTURE_TOWER);
			_.each(towers, function(t: StructureTower) {
				t.run();
			}, this);
			CpuTowers += (Game.cpu.getUsed() - CpuBeforeTowers);

			let CpuBeforeLinks = Game.cpu.getUsed();
			if (!!room.storage) {
				let links = _.filter(room.myStructures, (s: Structure) => s.structureType === STRUCTURE_LINK);
				_.each(links, function(l: StructureLink) {
					l.run();
				}, this);
			}
			if (!!room.terminal) {
				room.terminal.run();
			}
			CpuLinks += (Game.cpu.getUsed() - CpuBeforeLinks);

			if (Game.cpu.getUsed() < Game.cpu.limit) {
				let CpuBeforeLabs = Game.cpu.getUsed();
				if (room.myLabs.length > 2) {
					try {
						if (!!Game.flags[room.name + "_LR"]) {
							let flag = Game.flags[room.name + "_LR"];
							if (!(flag.color === COLOR_WHITE && flag.secondaryColor === COLOR_RED)) { // Clean All
								let reaction = global.labColors.resource(flag.color, flag.secondaryColor);
								let reagents = global.findReagents(reaction);
								let inLab1 = room.myLabs.filter((l: StructureLab) => l.mineralType === reagents[0] && l.mineralAmount > 0).pop();
								let inLab2 = room.myLabs.filter((l: StructureLab) => l.mineralType === reagents[1] && l.mineralAmount > 0).pop();
								if (!!inLab1 && !!inLab2) {
									let labs = room.myLabs.filter((l: StructureLab) => l.cooldown === 0 && l.id !== inLab1.id && l.id !== inLab2.id);
									labs.forEach((l: StructureLab) => l.runReaction(inLab1, inLab2));
								}
							}
						}
					} catch (e) {
						console.log(`ERROR :: RoomManager.runLabs: ${e.message}`);
					}
				}
				CpuLabs += (Game.cpu.getUsed() - CpuBeforeLabs);
			}

			// run the creeps in this room
			try {
				let statObject: CreepStats = CreepManager.governCreeps(room);
				CpuRoles += statObject.roles;
				CpuCreeps += statObject.creeps;
				allCreeps.push(statObject.perRole);
			} catch (e) {
				console.log (`ERROR :: Running Creeps for room ${room.name} : ${e.message}`);
			}
		}
	}
	try {
		let unifiedObject: any = {};
		allCreeps.forEach((x: any) => { // Room
			_.forOwn(x, (y: any, key: string) => { // Role
				if (!!unifiedObject[key]) {
					unifiedObject[key].numCreeps += y.numCreeps;
					unifiedObject[key].cpu += y.cpu;
				} else {
					unifiedObject[key] = {
						numCreeps: y.numCreeps,
						cpu: y.cpu,
					};
				}
			});
		});
		_.forOwn(unifiedObject, (x: any, key: string) => {
			StatsManager.addStat(`cpu.perrole.${key}.cpu`, x.cpu);
			StatsManager.addStat(`cpu.perrole.${key}.creeps`, x.numCreeps);
			StatsManager.addStat(`cpu.perrole.${key}.cpupercreep`, x.cpu / x.numCreeps);
		});
	} catch (e) {
		console.log(`ERROR :: PerRole Stats: ${e.message}`);
	}

	StatsManager.addStat("cpu.roominit", CpuRoomInit);
	StatsManager.addStat("cpu.towers", CpuTowers);
	StatsManager.addStat("cpu.links", CpuLinks);
	StatsManager.addStat("cpu.labs", CpuLabs);
	StatsManager.addStat("cpu.roles", CpuRoles);
	StatsManager.addStat("cpu.creeps", CpuCreeps);
}
