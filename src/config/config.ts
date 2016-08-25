/**
 * Enable this if you want a lot of text to be logged to console.
 * @type {boolean}
 */
export const VERBOSE: boolean = false;
export const CREEPSTATS: boolean = false;
export const ROOMSTATS: boolean = false;
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
export const MAX_TTL = 1400;

/**
 * Priorities for Regular Room Creeps
 * @type {number}
 */
export const PRIORITY_CREEP: number = -1;
export const PRIORITY_BUILDER: number = 30;
export const PRIORITY_HARVESTER: number = 10;
export const PRIORITY_MULE: number = 15;
export const PRIORITY_UPGRADER: number = 20;
export const PRIORITY_LINKER: number = 30;
export const PRIORITY_REPAIR: number = 40;
export const PRIORITY_MINER: number = 35;
export const PRIORITY_SCIENTIST: number = 31;

/**
 * Priorities for Assimilation Package Creeps
 * @type {number}
 */
export const PRIORITY_ASM_CLAIM: number = 10;
export const PRIORITY_ASM_HARVESTER: number = 20;
export const PRIORITY_ASM_MULE: number = 30;
export const PRIORITY_ASM_BUILDER: number = 40;

/**
 * Priorities for Warfare Package Creeps
 * @type {number}
 */
export const PRIORITY_WF_WARRIOR: number = 10;
export const PRIORITY_WF_RANGER: number = 20;
export const PRIORITY_WF_HEALER: number = 30;

/**
 * Minimum homeRoom RCL values for Regular Room Creeps
 * @type {number}
 */
export const MINRCL_CREEP: number = 0;
export const MINRCL_BUILDER: number = 1;
export const MINRCL_HARVESTER: number = 1;
export const MINRCL_MULE: number = 1;
export const MINRCL_UPGRADER: number = 1;
export const MINRCL_LINKER: number = 5;
export const MINRCL_REPAIR: number = 2;
export const MINRCL_MINER: number = 6;
export const MINRCL_SCIENTIST: number = 6;

/**
 * Minimum homeRoom RCL values for Assimilation Package Creeps
 * @type {number}
 */
export const MINRCL_ASM_CLAIM: number = 4;
export const MINRCL_ASM_HARVESTER: number = 4;
export const MINRCL_ASM_MULE: number = 4;
export const MINRCL_ASM_BUILDER: number = 4;

/**
 * Minimum homeRoom RCL values for Warfare Package Creeps
 * @type {number}
 */
export const MINRCL_WF_WARRIOR: number = 4;
export const MINRCL_WF_RANGER: number = 4;
export const MINRCL_WF_HEALER: number = 4;

export const BLACKLIST_SOURCES: string[] = [
	"af8ce260e6f676ef1f544211",
];

export function translateErrorCode(errorCode: number): string {
	switch (errorCode) {
		case OK:
			return "OK";
		case ERR_NOT_OWNER:
			return "ERR_NOT_OWNER";
		case ERR_NO_PATH:
			return "ERR_NO_PATH";
		case ERR_NAME_EXISTS:
			return "ERR_NAME_EXISTS";
		case ERR_BUSY:
			return "ERR_BUSY";
		case ERR_NOT_FOUND:
			return "ERR_NOT_FOUND";
		case ERR_NOT_ENOUGH_ENERGY:
			return "ERR_NOT_ENOUGH_ENERGY";
		case ERR_NOT_ENOUGH_RESOURCES:
			return "ERR_NOT_ENOUGH_RESOURCES";
		case ERR_INVALID_TARGET:
			return "ERR_INVALID_TARGET";
		case ERR_FULL:
			return "ERR_FULL";
		case ERR_NOT_IN_RANGE:
			return "ERR_NOT_IN_RANGE";
		case ERR_INVALID_ARGS:
			return "ERR_INVALID_ARGS";
		case ERR_TIRED:
			return "ERR_TIRED";
		case ERR_NO_BODYPART:
			return "ERR_NO_BODYPART";
		case ERR_NOT_ENOUGH_EXTENSIONS:
			return "ERR_NOT_ENOUGH_EXTENSIONS";
		case ERR_RCL_NOT_ENOUGH:
			return "ERR_RCL_NOT_ENOUGH";
		case ERR_GCL_NOT_ENOUGH:
			return "ERR_GCL_NOT_ENOUGH";
		default:
			return "Unknown Error Code.";
	}
}
export const RESOURCE_TYPES: string[] = [
	RESOURCE_HYDROGEN,
	RESOURCE_OXYGEN,
	RESOURCE_UTRIUM,
	RESOURCE_LEMERGIUM,
	RESOURCE_KEANIUM,
	RESOURCE_ZYNTHIUM,
	RESOURCE_CATALYST,
	RESOURCE_GHODIUM,

	RESOURCE_HYDROXIDE,
	RESOURCE_ZYNTHIUM_KEANITE,
	RESOURCE_UTRIUM_LEMERGITE,

	RESOURCE_UTRIUM_HYDRIDE,
	RESOURCE_UTRIUM_OXIDE,
	RESOURCE_KEANIUM_HYDRIDE,
	RESOURCE_KEANIUM_OXIDE,
	RESOURCE_LEMERGIUM_HYDRIDE,
	RESOURCE_LEMERGIUM_OXIDE,
	RESOURCE_ZYNTHIUM_HYDRIDE,
	RESOURCE_ZYNTHIUM_OXIDE,
	RESOURCE_GHODIUM_HYDRIDE,
	RESOURCE_GHODIUM_OXIDE,

	RESOURCE_UTRIUM_ACID,
	RESOURCE_UTRIUM_ALKALIDE,
	RESOURCE_KEANIUM_ACID,
	RESOURCE_KEANIUM_ALKALIDE,
	RESOURCE_LEMERGIUM_ACID,
	RESOURCE_LEMERGIUM_ALKALIDE,
	RESOURCE_ZYNTHIUM_ACID,
	RESOURCE_ZYNTHIUM_ALKALIDE,
	RESOURCE_GHODIUM_ACID,
	RESOURCE_GHODIUM_ALKALIDE,

	RESOURCE_CATALYZED_UTRIUM_ACID,
	RESOURCE_CATALYZED_UTRIUM_ALKALIDE,
	RESOURCE_CATALYZED_KEANIUM_ACID,
	RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
	RESOURCE_CATALYZED_LEMERGIUM_ACID,
	RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
	RESOURCE_CATALYZED_ZYNTHIUM_ACID,
	RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
	RESOURCE_CATALYZED_GHODIUM_ACID,
	RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
];

// Taken from:
// https://github.com/Sriep/screeps/blob/d307ac0e2ebf6b7c8ac1f0033baeed9679baa4da/building/lab.colours.js
export const labColors = {
	RESOURCE_ENERGY : { color : COLOR_WHITE , secondaryColor : COLOR_WHITE },
	RESOURCE_POWER : { color : COLOR_RED , secondaryColor : COLOR_RED },

	RESOURCE_HYDROGEN : { color : COLOR_GREY , secondaryColor : COLOR_WHITE },
	RESOURCE_OXYGEN : { color :  COLOR_YELLOW, secondaryColor : COLOR_WHITE },
	RESOURCE_UTRIUM : { color : COLOR_BLUE , secondaryColor : COLOR_WHITE },
	RESOURCE_KEANIUM : { color : COLOR_PURPLE , secondaryColor : COLOR_WHITE },
	RESOURCE_LEMERGIUM : { color : COLOR_GREEN , secondaryColor : COLOR_WHITE },
	RESOURCE_ZYNTHIUM : { color : COLOR_ORANGE , secondaryColor : COLOR_WHITE },
	RESOURCE_CATALYST : { color : COLOR_RED , secondaryColor : COLOR_WHITE },
	RESOURCE_GHODIUM : { color : COLOR_BROWN , secondaryColor : COLOR_WHITE },

	RESOURCE_HYDROXIDE : { color : COLOR_CYAN , secondaryColor : COLOR_WHITE },
	RESOURCE_ZYNTHIUM_KEANITE : { color : COLOR_ORANGE , secondaryColor : COLOR_PURPLE },
	RESOURCE_UTRIUM_LEMERGITE : { color : COLOR_BLUE , secondaryColor : COLOR_GREEN },

	RESOURCE_UTRIUM_HYDRIDE : { color : COLOR_BLUE , secondaryColor : COLOR_GREY },
	RESOURCE_UTRIUM_OXIDE : { color : COLOR_BLUE , secondaryColor : COLOR_YELLOW },
	RESOURCE_KEANIUM_HYDRIDE : { color : COLOR_PURPLE , secondaryColor : COLOR_GREY },
	RESOURCE_KEANIUM_OXIDE : { color : COLOR_PURPLE , secondaryColor : COLOR_YELLOW },
	RESOURCE_LEMERGIUM_HYDRIDE : { color : COLOR_GREEN , secondaryColor : COLOR_GREY },
	RESOURCE_LEMERGIUM_OXIDE : { color : COLOR_GREEN , secondaryColor : COLOR_YELLOW },
	RESOURCE_ZYNTHIUM_HYDRIDE : { color : COLOR_ORANGE , secondaryColor : COLOR_GREY },
	RESOURCE_ZYNTHIUM_OXIDE : { color : COLOR_ORANGE , secondaryColor : COLOR_YELLOW },
	RESOURCE_GHODIUM_HYDRIDE : { color : COLOR_BROWN , secondaryColor : COLOR_GREY },
	RESOURCE_GHODIUM_OXIDE : { color : COLOR_BROWN  , secondaryColor : COLOR_YELLOW },

	RESOURCE_UTRIUM_ACID : { color : COLOR_BLUE , secondaryColor : COLOR_ORANGE },
	RESOURCE_UTRIUM_ALKALIDE : { color : COLOR_BLUE , secondaryColor : COLOR_CYAN },
	RESOURCE_KEANIUM_ACID : { color : COLOR_PURPLE , secondaryColor : COLOR_ORANGE },
	RESOURCE_KEANIUM_ALKALIDE : { color : COLOR_PURPLE , secondaryColor : COLOR_CYAN },
	RESOURCE_LEMERGIUM_ACID : { color : COLOR_GREEN , secondaryColor : COLOR_ORANGE },
	RESOURCE_LEMERGIUM_ALKALIDE : { color : COLOR_GREEN , secondaryColor : COLOR_CYAN },
	RESOURCE_ZYNTHIUM_ACID : { color : COLOR_ORANGE , secondaryColor : COLOR_ORANGE },
	RESOURCE_ZYNTHIUM_ALKALIDE : { color : COLOR_ORANGE , secondaryColor : COLOR_CYAN },
	RESOURCE_GHODIUM_ACID : { color : COLOR_BROWN , secondaryColor : COLOR_ORANGE },
	RESOURCE_GHODIUM_ALKALIDE : { color : COLOR_BROWN , secondaryColor : COLOR_CYAN },

	RESOURCE_CATALYZED_UTRIUM_ACID : { color : COLOR_BLUE , secondaryColor : COLOR_RED },
	RESOURCE_CATALYZED_UTRIUM_ALKALIDE : { color : COLOR_BLUE , secondaryColor : COLOR_BLUE },
	RESOURCE_CATALYZED_KEANIUM_ACID : { color : COLOR_PURPLE , secondaryColor : COLOR_RED },
	RESOURCE_CATALYZED_KEANIUM_ALKALIDE : { color :  COLOR_PURPLE, secondaryColor : COLOR_BLUE },
	RESOURCE_CATALYZED_LEMERGIUM_ACID : { color : COLOR_GREEN , secondaryColor : COLOR_RED },
	RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE : { color : COLOR_GREEN , secondaryColor : COLOR_BLUE },
	RESOURCE_CATALYZED_ZYNTHIUM_ACID : { color : COLOR_ORANGE , secondaryColor : COLOR_RED },
	RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE : { color : COLOR_ORANGE , secondaryColor : COLOR_BLUE },
	RESOURCE_CATALYZED_GHODIUM_ACID : { color : COLOR_BROWN , secondaryColor : COLOR_RED },
	RESOURCE_CATALYZED_GHODIUM_ALKALIDE : { color : COLOR_BROWN , secondaryColor :  COLOR_BLUE },

	resource(color: number, secondaryColor: number) {
		return eval(_.findKey(this, { color : color, secondaryColor })); // tslint:disable-line
	},
};

export const findReagents = function(reaction: string): string[] {
	let reagents: string[] = undefined;
	_.forOwn(REACTIONS, (v1, k1) => {
		_.forOwn(v1, (v2, k2) => {
			if (v2 === reaction) {
				reagents = [k1, k2];
			}
		});
	});
	return reagents;
};
