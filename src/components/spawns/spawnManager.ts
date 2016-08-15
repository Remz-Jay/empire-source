import * as Config from "./../../config/config";

export let spawns: Spawn[];
export let spawnNames: string[] = [];
export let spawnCount: number;

export function load(room: Room) {
	spawns = room.find<Spawn>(FIND_MY_SPAWNS);
	spawnCount = _.size(spawns);

	_loadSpawnNames();

	if (Config.VERBOSE) {
		console.log("[SpawnManager] " + spawnCount + " spawns in room.");
	}
}

export function hasSpawn(): boolean {
	return (spawns.length < 1) ? false : true;
}

export function getFirstSpawn(): Spawn {
	let spawn =  spawns[0];
	if (!!spawn) {
		return spawn;
	} else {
		return Game.spawns[0];
	}
}

function _loadSpawnNames(): void {
	for (let spawnName in spawns) {
		if (spawns.hasOwnProperty(spawnName)) {
			spawnNames.push(spawnName);
		}
	}
}
