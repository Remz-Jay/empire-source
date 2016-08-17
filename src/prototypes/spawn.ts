interface StructureSpawn {
	isBusy: boolean;
	createCreepWhenIdle(body: string[], name?: string, memory?: any): number | string;
	getPriorityCreep(creeps: Creep[], reverse: boolean): Creep;
	renewCreeps(): void;
}

StructureSpawn.prototype.isBusy = false;
StructureSpawn.prototype.createCreepWhenIdle = function(body: string[], name?: string, memory?: any): number | string {
	if (this.isBusy) {
		return ERR_BUSY;
	} else {
		return this.createCreep(body, name, memory);
	}
};
StructureSpawn.prototype.getPriorityCreep = function(creeps: Creep[], reverse = false): Creep {
	let target: Creep = undefined;
	if (reverse) {
		_.reduce(creeps, function(result, value) {
			if ((value.ticksToLive) > result) {
				result = value.ticksToLive;
				target = value;
			}
			return result;
		}, -1);
		return target;
	}
	_.reduce(creeps, function(result, value) {
		if ((value.ticksToLive) < result) {
			result = value.ticksToLive;
			target = value;
		}
		return result;
	}, Infinity);
	return target;
};

StructureSpawn.prototype.renewCreeps = function(): void {
	let targets = this.pos.findInRange(FIND_MY_CREEPS, 1, {
		filter: (c: Creep) => c.memory.hasRenewed === false && c.ticksToLive < 1500,
	});
	if (targets.length > 0) {
		let reverse = (targets.length > 2) ? true : true;
		let prio = this.getPriorityCreep(targets, reverse);
		if (!!prio) {
			this.renewCreep(prio);
			this.isBusy = true;
		}
	}
};
