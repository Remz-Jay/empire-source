export let memory: Memory;

export function loadMemory(): void {
	this.memory = Memory;
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
	Object.keys(Memory.creeps).forEach(creepName => {
		if (!Game.creeps[creepName]) {
			Memory.creeps[creepName] = undefined;
		}
	});
	Object.keys(Memory.structures).forEach(structureId => {
		if (!Game.structures[structureId]) {
			Memory.structures[structureId] = undefined;
		}
	});
	for (let id in this.memory.powerBanks) {
		if (this.memory.powerBanks[id].indexed + this.memory.powerBanks[id].decay <= Game.time) {
			// powerBank expired
			delete this.memory.powerBanks[id];
		}
	}
}
