export let memory: Memory;

export function loadMemory(): void {
	this.memory = Memory;
	if (!this.memory.log) {
		this.memory.log = {
			creeps: [],
			rooms: [],
			move: [],
			asm: [],
		};
	}
	if (!this.memory.config) {
		this.memory.config = {
			Wall: [],
		};
	}
	if (!this.memory.config.ResourceTargets) {
		this.memory.config.ResourceTargets = {};
		RESOURCES_ALL.forEach((r: string) => {
			this.memory.config.ResourceTargets[r] = 10000;
		});
	}
	if (!this.memory.pathCache) {
		this.memory.pathCache = {};
	}
	if (!this.memory.matrixCache) {
		this.memory.matrixCache = {};
	}
	if (!this.memory.powerBanks) {
		this.memory.powerBanks = {};
	}
	if (!this.memory.powerManager) {
		this.memory.powerManager = {};
	}
	if (!Memory.stats) {
		Memory.stats = {};
	}
}

export function cleanMemory(): void {
	for (let name in this.memory.creeps) {
		if (!Game.creeps[name]) {
			delete this.memory.creeps[name];
			console.log(`Clearing non-existing creep memory: ${name}`);
		}
	}
	for (let id in this.memory.structures ) {
		if (!Game.structures[id]) {
			console.log("Garbage collecting structure " + id);
			delete Memory.structures[id];
		}
	}
	for (let name in this.memory.rooms) {
		delete this.memory.rooms[name].costMatrix;
		delete this.memory.rooms[name].matrixTime;
		delete this.memory.rooms[name].sources;
		delete this.memory.rooms[name].allStructures;
		delete this.memory.rooms[name].scanTime;
		if (_.isEmpty(this.memory.rooms[name])) {
			delete this.memory.rooms[name];
		}
	}
	for (let id in this.memory.powerBanks) {
		if (this.memory.powerBanks[id].indexed + this.memory.powerBanks[id].decay <= Game.time) {
			// powerBank expired
			delete this.memory.powerBanks[id];
		}
	}
}
