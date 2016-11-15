interface StructureSpawn {
	isBusy: boolean;
	createCreepWhenIdle(body: string[], name?: string, memory?: any): number | string;
	getPriorityCreep(creeps: Creep[], reverse: boolean): Creep;
	renewCreeps(): void;
	relocateCreeps(): void;
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
StructureSpawn.prototype.relocateCreeps = function(): void {
	const creeps = this.room.myCreeps.filter((c: Creep) =>
		!!c.memory.renewStation
		&& c.memory.renewStation === this.id
	);
	if (creeps.length > 0) {
		let s = this.room.mySpawns.find((s: StructureSpawn) => !s.isBusy);
		if (!!s) {
			creeps.forEach((c: Creep) => {
				c.memory.renewStation = s.id;
			});
		}
	}
};
StructureSpawn.prototype.renewCreeps = function(): void {
	const validCreeps = global.filterWithCache(`renew-targets-${this.room.name}`, this.room.myCreeps,
		(c: Creep) => c.ticksToLive < 1400
		&& !c.hasActiveBodyPart(CLAIM)
		&& !c.memory.isBoosted
	);
	const creeps = this.pos.findInRange(validCreeps, 1);
	let targets = creeps.filter((c: Creep) => c.ticksToLive < 100);
	if (targets.length > 0) {
		const prio = this.getPriorityCreep(targets);
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
		if (targets.length > 1 && prio.ticksToLive > 200) {
			// Send away the creep with the highest TTL if we're crowded to keep things moving.
			let s = this.room.mySpawns.find((s: StructureSpawn) => !s.isBusy);
			if (!!s) {
				prio.memory.renewStation = s.id;
			}
		}
	} else if (this.room.alliedCreeps.length > 0) {
		const alliedCreeps = global.filterWithCache(`allied-renew-targets-${this.room.name}`, this.room.alliedCreeps,
			(c: Creep) => c.ticksToLive < 1400
			&& !c.hasActiveBodyPart(CLAIM)
			&& _.filter(c.body, (bp: BodyPartDefinition) => !!bp.boost).length === 0
		);
		targets = this.pos.findInRange(alliedCreeps, 1);
		if (targets.length > 0) {
			prio = this.getPriorityCreep(targets, true);
			this.isBusy = true;
			this.renewCreep(prio);
		}
	}
};
