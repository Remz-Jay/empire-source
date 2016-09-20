import "./shared/utils";
import "./config/config";
import "./prototypes/room";
import "./prototypes/link";
import "./prototypes/terminal";
import "./prototypes/tower";
import "./prototypes/spawn";

import * as MemoryManager from "./shared/memoryManager";
import * as RoomManager from "./components/rooms/roomManager";
import * as AssimilationManager from "./packages/assimilation/assimilationManager";
// import * as OffenseManager from "./packages/warfare/managers/offense/offenseManager";
import * as MarketManager from "./components/market/marketManager";
// import ObserverManager from "./components/observers/observerManager";
let reset: number = 1;
delete Memory.log;
if (!global.costMatrix) {
	global.costMatrix = {};
}
if (!global.CACHE_SELL_ORDERS_BY_MINERAL_TYPE) {
	global.CACHE_SELL_ORDERS_BY_MINERAL_TYPE = [];
}
if (!global.CACHE_BUY_ORDERS_BY_MINERAL_TYPE) {
	global.CACHE_BUY_ORDERS_BY_MINERAL_TYPE = [];
}

console.log(global.colorWrap(`====== RESET ====== RESET ====== RESET ====== RESET ====== RESET ======`, "DeepPink"));
// RoomManager.loadRooms(); // This must be done early because we hook a lot of properties to Room.prototype!!
// global.om = new ObserverManager();

AssimilationManager.setup();
// OffenseManager.setup();

export function loop() {
		global.time = Game.time - global.TIME_OFFSET;
		PathFinder.use(true);
		let used = Game.cpu.getUsed();
		try {
			RoomManager.loadRooms(); // This must be done early because we hook a lot of properties to Room.prototype!!
			console.log(`Room Setup: ${_.ceil(Game.cpu.getUsed() - used)}`);
			MemoryManager.loadMemory();
			MemoryManager.cleanMemory();
		} catch (e) {
			console.log("Setup Exception", (<Error> e).message);
		}
		try {
			used = Game.cpu.getUsed();
			AssimilationManager.govern();
			console.log(`ASM: ${_.ceil(Game.cpu.getUsed() - used)}`);
		} catch (e) {
			console.log("AssimilationManager Exception", (<Error> e).message);
		}
/*
		try {
			OffenseManager.govern();
		} catch (e) {
			console.log("OffenseManager Exception", (<Error> e).message);
		}
*/
		try {
			used = Game.cpu.getUsed();
			RoomManager.governRooms();
			console.log(`Rooms: ${_.ceil(Game.cpu.getUsed() - used)}`);
		} catch (e) {
			console.log("RoomManager Exception", (<Error> e).message);
		}
		try {
			used = Game.cpu.getUsed();
			MarketManager.governMarket();
			console.log(`Market: ${_.ceil(Game.cpu.getUsed() - used)}`);
		} catch (e) {
			console.log("MarketManager Exception", (<Error> e).message);
		}
/*		try {
			// global.om.observe();
		} catch (e) {
			console.log("ObserverManager Exception", (<Error> e).message);
		}*/

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
		Memory.resetCounter += reset;
		reset = 0;
}
