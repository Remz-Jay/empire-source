import * as Config from "./../../config/config";

export let spawns: StructureSpawn[];
export let spawnNames: string[] = [];
export let spawnCount: number;

export function load(room: Room) {
	spawns = room.find<StructureSpawn>(FIND_MY_SPAWNS);
	spawnCount = _.size(spawns);

	_loadSpawnNames();

	if (Config.VERBOSE) {
		console.log("[SpawnManager] " + spawnCount + " spawns in room.");
	}
}

export function hasSpawn(): boolean {
	return (spawns.length < 1) ? false : true;
}

export function getFirstSpawn(): StructureSpawn {
	let spawn =  spawns[0];
	if (!!spawn) {
		return spawn;
	} else {
		return Game.spawns[0] as StructureSpawn;
	}
}

function _loadSpawnNames(): void {
	for (let spawnName in spawns) {
		if (spawns.hasOwnProperty(spawnName)) {
			spawnNames.push(spawnName);
		}
	}
}

export function renewCreeps(): void {
	spawns.forEach(function(s: StructureSpawn) {
		s.renewCreeps();
	});
}
