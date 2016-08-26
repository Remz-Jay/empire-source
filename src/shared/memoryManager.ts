export let memory: Memory;

export function loadMemory(): void {
	this.memory = Memory;
	if (!this.memory.log) {
		this.memory.log = {
			creeps: [],
			rooms: [],
			move: [],
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
