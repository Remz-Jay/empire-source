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
	let creeps = this.pos.findInRange(FIND_MY_CREEPS, 1, {
		filter: (c: Creep) => c.ticksToLive < 1400
		&& c.getActiveBodyparts(CLAIM) === 0,
	});
	let targets = creeps.filter((c: Creep) => c.ticksToLive < 100);
	if (targets.length > 0) {
		let prio = this.getPriorityCreep(targets);
		if (!!prio) {
			this.renewCreep(prio);
			this.isBusy = true;
			return;
		}
	}
	targets = creeps.filter((c: Creep) => c.memory.hasRenewed === false);
	let prio: Creep;
	if (targets.length > 0) {
		prio = this.getPriorityCreep(targets, true);
		this.isBusy = true;
	} else if (creeps.length > 0) {
		prio = this.getPriorityCreep(creeps);
		this.isBusy = false;
	}
	if (!!prio) {
		this.renewCreep(prio);
		if (targets.length > 4 && prio.ticksToLive > 400) {
			// Send away the creep with the highest TTL if we're crowded to keep things moving.
			prio.memory.hasRenewed = true;
			delete prio.memory.renewStation;
		}
	}
};
