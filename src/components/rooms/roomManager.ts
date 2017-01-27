import CreepManager from "./../creeps/creepManager";
import * as SourceManager from "./../sources/sourceManager";

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
	let cm = new CreepManager();
	for (const roomName in Game.rooms) {
		if (roomName === "sim") {
			Game.cpu.bucket = 10000;
		}
		const room = getRoomByName(roomName);
		if (!!room && !!room.my) {
			try {
				// TODO: fix this
/*				if (room.alliedCreeps.length > 0 && room.hostileCreeps.length === 0) {
					room.openRamparts();
				} else {
					room.closeRamparts();
				}*/
				if (room.mySpawns.length > 0) {
					room.mySpawns.forEach(function (s: StructureSpawn) {
						if (!!s.spawning) {
							s.isBusy = true;
							s.relocateCreeps();
						} else {
							s.renewCreeps();
						}
						if (room.hostileCreeps.length > 0) {
							s.checkSafeMode();
						}
					});
					SourceManager.load(room);
					SourceManager.updateHarvesterPreference();
				}
			} catch (e) {
				console.log("RoomManager.init", e.stack);
			}

			if (room.controller.level > 3 && room.myCreeps.length < 4) {
				if (!room.memory.creepAlarm) {
					Game.notify(`Number of creeps in room ${room.name} dropped to ${room.myCreeps.length}`);
					room.memory.creepAlarm = true;
				}
			} else {
				delete room.memory.creepAlarm;
			}
			try {
				_.invoke(room.myGroupedStructures[STRUCTURE_TOWER], "run");
			} catch (e) {
				console.log("RoomManager.Towers", room.name, e.stack);
			}

			if (Game.cpu.bucket > (global.BUCKET_MIN / 2) && Game.cpu.getUsed() < Game.cpu.limit) {
				try {
					_.invoke(room.myGroupedStructures[STRUCTURE_LINK], "run");
				} catch (e) {
					console.log("RoomManager.Links", room.name, e.stack);
				}
				if (!!room.powerSpawn && room.powerSpawn.power > 0 && room.powerSpawn.energy >= POWER_SPAWN_ENERGY_RATIO) {
					room.powerSpawn.processPower();
				}
				if (global.time % 5 === 0) {
					try {
						if (!!room.terminal) {
							room.terminal.run();
						}
					} catch (e) {
						console.log("RoomManager.Terminal", room.name, e.stack);
					}
				}
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
						console.log(`ERROR :: RoomManager.runLabs:`, room.name, e.stack);
					}
				}
			}

			if (Game.cpu.bucket > global.BUCKET_MIN + 1000 && Game.cpu.getUsed() < Game.cpu.limit) {
				try {
					if (!!room.observer) {
						room.observer.run();
					}
				} catch (e) {
					console.log("RoomManager.Observer", room.name, e.stack, e.stack);
				}
			}

			// run the creeps in this room
			if (Game.cpu.bucket > (global.BUCKET_MIN / 4) && (room.hostileCreeps.length > 0 || Game.cpu.getUsed() < Game.cpu.limit)) {
				try {
					cm.governCreeps(room);
				} catch (e) {
					console.log (`ERROR :: Running Creeps for room ${room.name} : ${e.stack}`);
				}
			}
		}
	}
}
