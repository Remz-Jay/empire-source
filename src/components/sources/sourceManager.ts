export let sources: ISource[];
export let sourceRoom: Room;

interface ISource extends Source {
	memory?: any;
}
export function initMemory(room: Room) {
	if (!room.memory.sources) {
		room.memory.sources = {};
		_.each(sources, function (s: ISource) {
			s.memory = s.room.memory.sources[s.id] = {};
		}, this);
	}
}

export function load(room: Room) {
	sourceRoom = room;
	sources = sourceRoom.sources;
	blacklistSources(global.BLACKLIST_SOURCES);
	initMemory(room);
	_.each(sources, function (s: ISource) {
		s.memory = s.room.memory.sources[s.id];
	}, this);
}

export function getFirstSource(): Source {
	return sources[0];
}

export function blacklistSources(sourceIds: string[]): boolean {
	_.each(sourceIds, function (s: string) {
		const removed = _.remove(sources, {
			id: s,
		});
		if (removed.length > 0) {
			if (global.VERBOSE) {
				console.log(`Removed source ${removed[0].id} from sources. ${sources.length} remain.`);
			}
		}
	}, this);
	return true;
}

export function findAvailableHarvester(s: Source) {
	const harvesters = _.filter(s.room.myCreeps, (c: Creep) => c.memory.role.toUpperCase() === "Harvester".toUpperCase());
	return harvesters.find((h: Creep) => !h.memory.preferredSource);
}

export function updateHarvesterPreference() {
	const mhps = getMaxHarvestersPerSource();
	_.each(sources, function (s: ISource) {
		for (let i = 1; i <= global.MAX_HARVESTERS_PER_SOURCE; i++) {
			if (i > mhps || i > getMiningSlots(s).length) {
				if (!s.memory[`preferredHarvester${i}`]) {
					const preferredHarvester: string = s.memory[`preferredHarvester${i}`];
					delete s.memory[`preferredHarvester${i}`];
					if (!!Game.creeps[preferredHarvester]) {
						delete Game.creeps[preferredHarvester].memory.preferredSource;
						delete Game.creeps[preferredHarvester].memory.target_source_id;
					}
				}
			} else {
				if (!s.memory[`preferredHarvester${i}`]
					|| (
						!Game.creeps[s.memory[`preferredHarvester${i}`]] // Assigned harvester has died
						|| !Game.creeps[s.memory[`preferredHarvester${i}`]].memory.preferredSource // Harvester doesn't know about this source.
						// || Game.creeps[s.memory.preferredHarvester].memory.preferredSource != s.id // Harvester doesn't know about this source.
					)
				) {
					const ph = findAvailableHarvester(s);
					if (!!ph) {
						const preferredHarvester = ph.name;
						console.log(`Found ${preferredHarvester} for  ${s.id}`);
						Game.creeps[preferredHarvester].memory.preferredSource = s.id;
						Game.creeps[preferredHarvester].memory.target_source_id = s.id;
						s.memory[`preferredHarvester${i}`] = preferredHarvester;
					}
				}
			}
		}
	}, this);
}
export function getMiningSlots(source: ISource): LookAtResultWithPos[] {
	if (!!source.memory.slots && _.isArray(source.memory.slots)) {
		return source.memory.slots;
	} else {
		const lookResults: LookAtResultWithPos[] = source.room.lookForAtArea(
			LOOK_TERRAIN,
			source.pos.y - 1,
			source.pos.x - 1,
			source.pos.y + 1,
			source.pos.x + 1,
			true // returns a LookAtResultWithPos[]
		) as LookAtResultWithPos[];
		let slots: LookAtResultWithPos[] = [];
		for (const result of lookResults) {
			if (result.terrain === "plain" || result.terrain === "swamp") {
				slots.push(result);
			}
		}
		source.memory.slots = slots;
		return slots;
	}
}

export function getMaxHarvestersPerSource(): number {
	return 1;
/*	const capacity: number = sourceRoom.energyCapacityAvailable;
	const max: number = 1;
	if (capacity < 1200) {
		max = 2;
	}
	if (capacity < 600 || isEmergency()) {
		max = global.MAX_HARVESTERS_PER_SOURCE;
	}
	return max;*/
}

export function getNumberOfRequiredHarvesters(): number {
	const max: number = getMaxHarvestersPerSource();
	let num: number = 0;
	_.each(sources, function(s: Source) {
		const maxPos: number = getMiningSlots(s).length;
		if (max > maxPos) {
			num = num + maxPos;
		} else {
			num = num + max;
		}
	}, this);
	return num;
}

export function isEmergency(): boolean {
	return ((sourceRoom.energyInContainers + sourceRoom.energyAvailable) < (sourceRoom.energyCapacityAvailable * 0.8));
}
