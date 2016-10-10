import "./shared/utils";
import "./config/config";
import "./prototypes/ownedstructure";
import "./prototypes/source";
import "./prototypes/room";
import "./prototypes/creep";
import "./prototypes/link";
import "./prototypes/terminal";
import "./prototypes/tower";
import "./prototypes/spawn";
import "./prototypes/observer";

import * as MemoryManager from "./shared/memoryManager";
import * as RoomManager from "./components/rooms/roomManager";
import * as AssimilationManager from "./packages/assimilation/assimilationManager";
import * as OffenseManager from "./packages/warfare/managers/offense/offenseManager";
import * as MarketManager from "./components/market/marketManager";
import PowerManager from "./components/power/powerManager";
// import ObserverManager from "./components/observers/observerManager";
let reset: number = 1;
delete Memory.log;
if (!global.costMatrix) {
	global.costMatrix = {};
}

console.log(global.colorWrap(`====== RESET ====== RESET ====== RESET ====== RESET ====== RESET ======`, "DeepPink"));
// RoomManager.loadRooms(); // This must be done early because we hook a lot of properties to Room.prototype!!
// global.om = new ObserverManager();

AssimilationManager.setup();
OffenseManager.setup();

export function loop() {
	global.time = Game.time - global.TIME_OFFSET;
	PathFinder.use(true);
	let used = Game.cpu.getUsed();
	MemoryManager.loadMemory();
	if (global.time & 5) {
		MemoryManager.cleanMemory();
	}
	console.log(`Memory Init: ${_.round(Game.cpu.getUsed() - used, 2)}`);
	used = Game.cpu.getUsed();
	global.tickCache = {
		roles: _.groupBy(Game.creeps, "memory.role"),
		rolesByRoom: {},
		storageLink: {},
		storageTower: {},
	};
	_.forOwn(global.tickCache.roles, (ca: Creep[], key: string) => {
		global.tickCache.rolesByRoom[key] = _.groupBy(ca, "memory.homeRoom");
	});
	console.log(`Cache Init: ${_.round(Game.cpu.getUsed() - used, 2)}`);
	used = Game.cpu.getUsed();
	try {
		RoomManager.loadRooms(); // This must be done early because we hook a lot of properties to Room.prototype!!
		console.log(`Room Setup: ${_.round(Game.cpu.getUsed() - used, 2)}`);
	} catch (e) {
		console.log("Setup Exception", (<Error> e).message);
	}
	try {
		used = Game.cpu.getUsed();
		AssimilationManager.govern();
		console.log(`ASM: ${_.round(Game.cpu.getUsed() - used, 2)}`);
	} catch (e) {
		console.log("AssimilationManager Exception", (<Error> e).message);
	}
	if (!!Memory.offense.targets && Memory.offense.targets.length > 0) {
		try {
			used = Game.cpu.getUsed();
			OffenseManager.govern();
			console.log(`Offense: ${_.round(Game.cpu.getUsed() - used, 2)}`);
		} catch (e) {
			console.log("OffenseManager Exception", (<Error> e).message);
		}
	}
	try {
		used = Game.cpu.getUsed();
		RoomManager.governRooms();
		console.log(`Rooms: ${_.round(Game.cpu.getUsed() - used, 2)}`);
	} catch (e) {
		console.log("RoomManager Exception", (<Error> e).message);
	}
	try {
		used = Game.cpu.getUsed();
		MarketManager.governMarket();
		console.log(`Market: ${_.round(Game.cpu.getUsed() - used, 2)}`);
	} catch (e) {
		console.log("MarketManager Exception", (<Error> e).message);
	}
	try {
		used = Game.cpu.getUsed();
		let pm = new PowerManager();
		pm.govern();
		console.log(`PowerManager: ${_.round(Game.cpu.getUsed() - used, 2)}`);
	} catch (e) {
		console.log("PowerManager Exception", e.stack);
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
	const perc = _.floor(Game.gcl.progress / (Game.gcl.progressTotal / 100));
	const cpuUsed = _.ceil(Game.cpu.getUsed());
	const cpuColor = (cpuUsed > Game.cpu.limit) ? "OrangeRed" : "LightGreen";
	const bucket = Game.cpu.bucket || 0;
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
	const credits = Game.market.credits || 0; // Sim doesn't have this.
	console.log(`End of tick ${Game.time}.\t`
		+ global.colorWrap(`GCL:${Game.gcl.level}@${perc}%\t`, "DodgerBlue")
		+ global.colorWrap(`CPU:${cpuUsed}/${Game.cpu.limit}\t`, cpuColor)
		+ global.colorWrap(`RES:${Game.cpu.tickLimit}/${bucket.toLocaleString()}\t`, bucketColor)
		+ global.colorWrap(`MKT:${credits.toLocaleString()}`, "CornflowerBlue")
	);
	reset = 0;
}
