/**
 * Application bootstrap.
 * BEFORE CHANGING THIS FILE, make sure you read this:
 * http://support.screeps.com/hc/en-us/articles/204825672-New-main-loop-architecture
 */
import "./prototypes/room";
import "./prototypes/link";
import "./prototypes/tower";

import * as StatsManager from "./shared/statsManager";
import * as Profiler from "./lib/screeps-profiler";
import * as MemoryManager from "./shared/memoryManager";

import * as RoomManager from "./components/rooms/roomManager";
import * as CreepManager from "./components/creeps/creepManager";
import * as AssimilationManager from "./packages/assimilation/assimilationManager";
import * as OffenseManager from "./packages/warfare/managers/offense/offenseManager";

Profiler.enable();
StatsManager.init();

// This code is executed only when Screeps system reloads your script.
// Use this bootstrap wisely. You can cache some of your stuff to save CPU
// You should extend prototypes before game loop in here.
RoomManager.loadRooms();

// Screeps" system expects this "loop" method in main.js to run the application.
// If we have this line, we can make sure that globals bootstrap and game loop work.
// http://support.screeps.com/hc/en-us/articles/204825672-New-main-loop-architecture

export function loop() {
	// This is executed every tick
	Profiler.wrap(function () {
		PathFinder.use(true);
		MemoryManager.loadMemory();
		MemoryManager.cleanMemory();
		CreepManager.loadCreeps();
		let CpuInit = Game.cpu.getUsed();
		let cpuBeforeStats = Game.cpu.getUsed();
		StatsManager.runBuiltinStats();
		StatsManager.addStat("cpu.stats", Game.cpu.getUsed() - cpuBeforeStats);
		StatsManager.addStat("cpu.init", CpuInit);
		RoomManager.governRooms();
		AssimilationManager.govern();
		OffenseManager.govern();
		StatsManager.addStat("cpu.getUsed", Game.cpu.getUsed());
	});

}
