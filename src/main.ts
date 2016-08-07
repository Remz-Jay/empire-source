/**
 * Application bootstrap.
 * BEFORE CHANGING THIS FILE, make sure you read this:
 * http://support.screeps.com/hc/en-us/articles/204825672-New-main-loop-architecture
 */
import "./prototypes/room";
import "./prototypes/link";

import StatsManager from "./shared/statsManager";
import * as Profiler from "./lib/screeps-profiler";
import * as MemoryManager from "./shared/memoryManager";

import * as RoomManager from "./components/rooms/roomManager";
import * as SpawnManager from "./components/spawns/spawnManager";
import * as SourceManager from "./components/sources/sourceManager";
import * as CreepManager from "./components/creeps/creepManager";

Profiler.enable();
let StatsMan = new StatsManager();

// This code is executed only when Screeps system reloads your script.
// Use this bootstrap wisely. You can cache some of your stuff to save CPU
// You should extend prototypes before game loop in here.
RoomManager.loadRooms();
SpawnManager.loadSpawns();
SourceManager.loadSources();

// Screeps" system expects this "loop" method in main.js to run the application.
// If we have this line, we can make sure that globals bootstrap and game loop work.
// http://support.screeps.com/hc/en-us/articles/204825672-New-main-loop-architecture

export function loop() {
	// This is executed every tick
	Profiler.wrap(function () {
		PathFinder.use(true);
		MemoryManager.loadMemory();
		CreepManager.loadCreeps();
		CreepManager.governCreeps();
		StatsMan.runBuiltinStats();
		StatsMan.addStat("cpu.getUsed", Game.cpu.getUsed());
	});

}
