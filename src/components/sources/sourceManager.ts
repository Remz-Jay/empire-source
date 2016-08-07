import * as Config from "./../../config/config";

export let sources: ISource[];
export let sourceCount: number;

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
	sources = room.find<Source>(FIND_SOURCES_ACTIVE);
	sourceCount = _.size(sources);
	if (Config.VERBOSE) {
		console.log("[SourceManager] " + sourceCount + " sources in room.");
	}
	blacklistSources(Config.BLACKLIST_SOURCES);
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
		let removed = _.remove(sources, {
			id: s,
		});
		if (removed.length > 0) {
			if (Config.VERBOSE) {
				console.log(`Removed source ${removed[0].id} from sources. ${sources.length} remain.`);
			}
		}
	}, this);
	return true;
}

export function findAvailableHarvester(s: Source) {
	let harvesters = _.filter(Game.creeps, creep => creep.memory.role === "Harvester");
	return _.find(harvesters, function (h: Creep) {
		return (!h.memory.preferredSource) && s.room.name === h.room.name;
	});
};

export function updateHarvesterPreference() {
	_.each(sources, function (s: ISource) {
		for (let i = 1; i <= Config.MAX_HARVESTERS_PER_SOURCE; i++) {
			if (!s.memory[`preferredHarvester${i}`]
				|| (
					!Game.creeps[s.memory[`preferredHarvester${i}`]] // Assigned harvester has died
					|| !Game.creeps[s.memory[`preferredHarvester${i}`]].memory.preferredSource // Harvester doesn't know about this source.
					// || Game.creeps[s.memory.preferredHarvester].memory.preferredSource != s.id // Harvester doesn't know about this source.
				)
			) {
				let ph = findAvailableHarvester(s);
				if (!!ph) {
					let preferredHarvester = ph.name;
					console.log(`Found ${preferredHarvester} for  ${s.id}`);
					Game.creeps[preferredHarvester].memory.preferredSource = s.id;
					Game.creeps[preferredHarvester].memory.target_source_id = s.id;
					s.memory[`preferredHarvester${i}`] = preferredHarvester;
				}
			}
		}
	}, this);
};
