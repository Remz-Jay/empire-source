import "./config/config";
import "./prototypes/room";
import "./prototypes/link";
import "./prototypes/terminal";
import "./prototypes/tower";
import "./prototypes/spawn";

import * as StatsManager from "./shared/statsManager";
import * as Profiler from "./lib/screeps-profiler";
import * as MemoryManager from "./shared/memoryManager";

import * as RoomManager from "./components/rooms/roomManager";
import * as AssimilationManager from "./packages/assimilation/assimilationManager";
import * as OffenseManager from "./packages/warfare/managers/offense/offenseManager";
import * as MarketManager from "./components/market/marketManager";
// import ObserverManager from "./components/observers/observerManager";

delete Memory.log;

console.log(global.colorWrap(`====== RESET ====== RESET ====== RESET ====== RESET ====== RESET ======`, "DeepPink"));
// global.om = new ObserverManager();
// Profiler.enable();

/*
Profiler.registerObject(StatsManager, "StatsManager");
Profiler.registerObject(RoomManager, "RoomManager");
Profiler.registerObject(CreepManager, "CreepManager");
Profiler.registerObject(AssimilationManager, "AssimilationManager");
Profiler.registerObject(OffenseManager, "OffenseManager");
*/

StatsManager.init();

export function loop() {
	Profiler.wrap(function () {
		PathFinder.use(true);
		RoomManager.loadRooms(); // This must be done early because we hook a lot of properties to Room.prototype!!
		MemoryManager.loadMemory();
		MemoryManager.cleanMemory();
/*		let CpuInit = Game.cpu.getUsed();

		let cpuBeforeStats = Game.cpu.getUsed();
		// let runExpensive = (Game.time % 5 === 0) ? true : false;
		let runExpensive = true;
		StatsManager.runBuiltinStats(runExpensive);
		StatsManager.addStat("cpu.stats", Game.cpu.getUsed() - cpuBeforeStats);
		StatsManager.addStat("cpu.init", CpuInit);*/

		try {
			AssimilationManager.govern();
		} catch (e) {
			console.log("AssimilationManager Exception", (<Error> e).message);
		}
		try {
			OffenseManager.govern();
		} catch (e) {
			console.log("OffenseManager Exception", (<Error> e).message);
		}
		try {
			RoomManager.governRooms();
		} catch (e) {
			console.log("RoomManager Exception", (<Error> e).message);
		}
		try {
			MarketManager.governMarket();
		} catch (e) {
			console.log("MarketManager Exception", (<Error> e).message);
		}

/*		if (!!Memory.showLogCreep) {
			Memory.log.creeps.forEach((message: String, index: number) => {
				console.log("log.creeps", message);
			});
		}
		if (!!Memory.showLogMove) {
			Memory.log.move.forEach((message: String, index: number) => {
				console.log("log.move", message);
			});
		}
		if (!!Memory.showLogAsm) {
			Memory.log.asm.forEach((message: String, index: number) => {
				console.log("log.ASM", message);
			});
		}*/
		delete Memory.log;
		let perc = _.floor(Game.gcl.progress / (Game.gcl.progressTotal / 100));
		let cpuUsed = _.ceil(Game.cpu.getUsed());
		let cpuColor = (cpuUsed > Game.cpu.limit) ? "OrangeRed" : "LightGreen";
		let bucket = Game.cpu.bucket || 0;
		let bucketColor = "Tomato";
		if (bucket > global.BUCKET_MIN / 4) {
			bucketColor = "Salmon";
		}
		if (bucket > global.BUCKET_MIN / 2) {
			bucketColor = "Orange";
		}
		if (bucket > global.BUCKET_MIN) {
			bucketColor = "LightGreen";
		}
		let credits = Game.market.credits || 0; // Sim doesn't have this.
		console.log(`End of tick ${Game.time}.\t`
			+ global.colorWrap(`GCL:${Game.gcl.level}@${perc}%\t`, "DodgerBlue")
			+ global.colorWrap(`CPU:${cpuUsed}/${Game.cpu.limit}\t`, cpuColor)
			+ global.colorWrap(`RES:${Game.cpu.tickLimit}/${bucket.toLocaleString()}\t`, bucketColor)
			+ global.colorWrap(`MKT:${credits.toLocaleString()}`, "CornflowerBlue")
		);
		StatsManager.addStat("cpu.getUsed", cpuUsed);
	});
}
