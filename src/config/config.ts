/**
 * Enable this if you want a lot of text to be logged to console.
 * @type {boolean}
 */
export const VERBOSE: boolean = false;

/**
 * For extra chatty output.
 * @type {boolean}
 */
export const DEBUG: boolean = false;
/**
 * @type {number}
 */
export const MAX_HARVESTERS_PER_SOURCE: number = 4;

/**
 * Default amount of minimal ticksToLive Screep can have, before it goes to renew.
 * This is only default value, that don't have to be used.
 * So it doesn't cover all Screeps.
 * @type {number}
 */
export const DEFAULT_MIN_LIFE_BEFORE_NEEDS_REFILL: number = 200;

export const PRIORITY_CREEP: number = -1;
export const PRIORITY_BUILDER: number = 30;
export const PRIORITY_HARVESTER: number = 10;
export const PRIORITY_UPGRADER: number = 20;

export const BLACKLIST_SOURCES: string[]  = [
	"e14b8a0b914bfec5a61dd8f5",
];
