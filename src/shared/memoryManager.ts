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
	if (!this.memory.pathCache) {
		this.memory.pathCache = {};
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
}
