export let memory: Memory;

export function loadMemory(): void {
	this.memory = Memory;
	if (!this.memory.resetCounter) {
		this.memory.resetCounter = 0;
	}
	if (Game.time & 3000) {
		this.memory.resetCounter = 0;
	}
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
}

export function cleanMemory(): void {
	for (let name in this.memory.creeps) {
		if (!Game.creeps[name]) {
			delete this.memory.creeps[name];
			console.log(`Clearing non-existing creep memory: ${name}`);
		}
	}
}
