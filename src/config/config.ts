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
export const MAX_HARVESTERS_PER_SOURCE: number = 3;

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
export const PRIORITY_MULE: number = 15;
export const PRIORITY_UPGRADER: number = 20;
export const PRIORITY_LINKER: number = 30;
export const PRIORITY_REPAIR: number = 40;

export const MINRCL_CREEP: number = 0;
export const MINRCL_BUILDER: number = 1;
export const MINRCL_HARVESTER: number = 1;
export const MINRCL_MULE: number = 2;
export const MINRCL_UPGRADER: number = 1;
export const MINRCL_LINKER: number = 5;
export const MINRCL_REPAIR: number = 2;

export const BLACKLIST_SOURCES: string[] = [
	"af8ce260e6f676ef1f544211",
];
