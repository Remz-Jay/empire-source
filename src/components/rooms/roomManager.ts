import * as CreepManager from "./../creeps/creepManager";
import * as SourceManager from "./../sources/sourceManager";
import * as WallManager from "../walls/wallManager";
import * as RampartManager from "../ramparts/rampartManager";

export let rooms: { [roomName: string]: Room };
export function loadRooms() {
	rooms = {};
	global.labReactions = [];
	global.boostReagents = [];
	global.sendRegistry = [];
	global.targetBlackList = {};
	global.linkBlackList = [];
	_.each(Game.rooms, function(r: Room) {
		r.addProperties();
		rooms[r.name] = r;
		if (!!r.labReaction) {
			global.labReactions.push({
				room: r,
				reaction: r.labReaction,
				reagents: r.labReagents,
			});
		}
	});
}

export function getRoomByName(roomName: string): Room {
	if (rooms.hasOwnProperty(roomName))  {
		return rooms[roomName];
	} else if (!!Game.rooms[roomName]) {
		const r = Game.rooms[roomName];
		r.addProperties();
		rooms[r.name] = r;
		return r;
	}  else {
		return undefined;
	}
}

export function governRooms(): void {
	for (const roomName in Game.rooms) {
		if (roomName === "sim") {
			Game.cpu.bucket = 10000;
		}
		const room = getRoomByName(roomName);
		if (!!room && !!room.controller && room.controller.level > 0 && room.controller.my) {
			try {
				WallManager.load(room);
				WallManager.adjustStrength();
				RampartManager.load(room);
				RampartManager.adjustStrength();
				if (room.alliedCreeps.length > 0 && room.hostileCreeps.length === 0) {
					RampartManager.openRamparts();
				} else {
					RampartManager.closeRamparts();
				}
				if (room.mySpawns.length > 0) {
					room.mySpawns.forEach(function (s: StructureSpawn) {
						if (!!s.spawning) {
							s.isBusy = true;
						} else {
							s.renewCreeps();
						}
						s.checkSafeMode();
					});
					SourceManager.load(room);
					SourceManager.updateHarvesterPreference();
				}
			} catch (e) {
				console.log("RoomManager.init", e.message);
			}

			if (room.controller.level > 3 && room.myCreeps.length < 4) {
				if (!room.memory.creepAlarm) {
					Game.notify(`Number of creeps in room ${room.name} dropped to ${room.myCreeps.length}`);
					room.memory.creepAlarm = true;
				}
			} else {
				delete room.memory.creepAlarm;
			}
			if (global.ROOMSTATS) {
				// this is one of our controlled rooms
				console.log(`Room ${room.name} has ${room.energyAvailable}/${room.energyCapacityAvailable} energy and ` +
					`${room.energyInContainers}/${room.containerCapacityAvailable} (${room.energyPercentage}%) in storage.` +
					` (RCL=${room.controller.level} @ ${_.floor(room.controller.progress / (room.controller.progressTotal / 100))}%)`
				);
			}

			try {
				const towers = room.myGroupedStructures[STRUCTURE_TOWER];
				_.each(towers, (t: StructureTower) => {
					t.run();
				});
			} catch (e) {
				console.log("RoomManager.Towers", room.name, e.message);
			}

			if (Game.cpu.bucket > (global.BUCKET_MIN / 2)) {
				try {
					if (!!room.storage) {
						const links = room.myGroupedStructures[STRUCTURE_LINK];
						_.each(links, (l: StructureLink) => {
							l.run();
						});
					}
				} catch (e) {
					console.log("RoomManager.Links", room.name, e.message);
				}
			}
			if (global.time % 5 === 0 && Game.cpu.bucket > (global.BUCKET_MIN / 2)) {
				try {
					if (!!room.terminal) {
						room.terminal.run();
					}
				} catch (e) {
					console.log("RoomManager.Terminal", room.name, e.message);
				}
			}

			if (Game.cpu.bucket > global.BUCKET_MIN) {
				if (room.myLabs.length > 2) {
					try {
						if (!!room.labReaction) {
							const inLab1 = room.myLabs.find((l: StructureLab) => l.mineralType === room.labReagents[0] && l.mineralAmount >= LAB_REACTION_AMOUNT);
							const inLab2 = room.myLabs.find((l: StructureLab) => l.mineralType === room.labReagents[1] && l.mineralAmount >= LAB_REACTION_AMOUNT);
							if (!!inLab1 && !!inLab2) {
								const labs = room.myLabs.filter((l: StructureLab) => l.cooldown === 0 && l.id !== inLab1.id && l.id !== inLab2.id);
								labs.forEach((l: StructureLab) => l.runReaction(inLab1, inLab2));
							}
						}
					} catch (e) {
						console.log(`ERROR :: RoomManager.runLabs:`, room.name, e.message);
					}
				}
				try {
					if (!!room.observer) {
						room.observer.run();
					}
				} catch (e) {
					console.log("RoomManager.Observer", room.name, e.message, e.stack);
				}
			}

			// run the creeps in this room
			if (Game.cpu.bucket > (global.BUCKET_MIN / 4)) {
				try {
					CreepManager.governCreeps(room);
				} catch (e) {
					console.log (`ERROR :: Running Creeps for room ${room.name} : ${e.message}`);
				}
				try {
					if (!!room.powerSpawn && room.powerSpawn.power >= 0 && room.powerSpawn.energy >= 50) {
						room.powerSpawn.processPower();
					}
				} catch (e) {
					console.log(`ERROR :: RoomManager.runPowerSpawn:`, room.name, e.message);
				}
			}
		}
	}
}
