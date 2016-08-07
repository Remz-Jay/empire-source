import * as Config from "./../../config/config";

export let sources: Source[];
export let sourceCount: number;

export function load(room: Room) {
	sources = room.find<Source>(FIND_SOURCES_ACTIVE);
	sourceCount = _.size(sources);
	if (Config.VERBOSE) {
		console.log("[SourceManager] " + sourceCount + " sources in room.");
	}
	blacklistSources(Config.BLACKLIST_SOURCES);
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
