import * as Config from "./../../config/config";
import * as RoomManager from "./../rooms/roomManager";

export let sources: Source[];
export let sourceCount: number;

export function loadSources() {
	sources = RoomManager.getFirstRoom().find<Source>(FIND_SOURCES_ACTIVE);
	sourceCount = _.size(sources);

	if (Config.VERBOSE) {
		console.log(sourceCount + " sources in room.");
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
		if (Config.VERBOSE) {
			console.log(`Removed source ${removed[0].id} from sources. ${sources.length} remain.`);
		}
	}, this);
	return true;
}
