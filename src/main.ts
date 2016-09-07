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
import * as CreepManager from "./components/creeps/creepManager";
import * as AssimilationManager from "./packages/assimilation/assimilationManager";
import * as OffenseManager from "./packages/warfare/managers/offense/offenseManager";
import * as MarketManager from "./components/market/marketManager";

delete Memory.log;

console.log(global.colorWrap(`====== RESET ====== RESET ====== RESET ====== RESET ====== RESET ======`, "DeepPink"));
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
		CreepManager.loadCreeps();
		let CpuInit = Game.cpu.getUsed();

		let cpuBeforeStats = Game.cpu.getUsed();
		StatsManager.runBuiltinStats();
		StatsManager.addStat("cpu.stats", Game.cpu.getUsed() - cpuBeforeStats);
		StatsManager.addStat("cpu.init", CpuInit);

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

		if (!!Memory.showLogCreep) {
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
		}
		delete Memory.log;
		if (!!Memory.showTransactions && Game.cpu.getUsed() < Game.cpu.limit) {
			console.log();
			console.log(`Incoming Transactions:`);
			_.take(Game.market.incomingTransactions, 5).forEach((t: Transaction) => {
				t = _.defaults<Transaction>(t, {
					sender: {username: "NPC" },
				});
				console.log(t.sender.username, t.resourceType, t.amount, t.from, t.to, t.description);
			});
			console.log();
			console.log(`Outgoing Transactions:`);
			_.take(Game.market.outgoingTransactions, 5).forEach((t: Transaction) => {
				_.defaults<Transaction>(t, {
					recipient: {username: "NPC" },
				});
				console.log(t.recipient.username, t.resourceType, t.amount, t.from, t.to, t.description);
			});
		}
		let perc = _.floor(Game.gcl.progress / (Game.gcl.progressTotal / 100));
		let cpuUsed = _.ceil(Game.cpu.getUsed());
		let cpuColor = (cpuUsed > Game.cpu.limit) ? "OrangeRed" : "LightGreen";
		let bucketColor = (Game.cpu.bucket > 9000) ? "LightGreen" : "Tomato";
		console.log(`End of tick ${Game.time}.\t`
			+ global.colorWrap(`GCL:${Game.gcl.level}@${perc}%\t`, "DodgerBlue")
			+ global.colorWrap(`CPU:${cpuUsed}/${Game.cpu.limit}\t`, cpuColor)
			+ global.colorWrap(`RES:${Game.cpu.tickLimit}/${Game.cpu.bucket.toLocaleString()}\t`, bucketColor)
			+ global.colorWrap(`MKT:${Game.market.credits.toLocaleString()}`, "CornflowerBlue")
		);
		StatsManager.addStat("cpu.getUsed", cpuUsed);
	});
}
