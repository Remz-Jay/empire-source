/**
 * Enable this if you want a lot of text to be logged to console.
 * @type {boolean}
 */
global.VERBOSE = false;
global.CREEPSTATS = false;
global.ROOMSTATS = false;
/**
 * For extra chatty output.
 * @type {boolean}
 */
global.DEBUG = false;
/**
 * @type {number}
 */
global.MAX_HARVESTERS_PER_SOURCE = 3;

/**
 * Value that gets substracted from Game.time to ease modulo operations.
 * @type {number}
 */
global.TIME_OFFSET = 13773000;
/**
 * The maximum number of Energy stored in terminals
 * @type {number}
 */
global.TERMINAL_ENERGY_MAX = 25000;
/**
 * The maximum number of Mineral Resources (per type) stored in terminals
 * @type {number}
 */
global.TERMINAL_MAX = 6000;

/**
 * The minumum amount of energy a Storage should contain before performing aux tasks.
 * @type {number}
 */
global.STORAGE_MIN = 100000;

/**
 * The minimum amount of bucket we should have. Auxilary tasks will be executed if above this number.
 * @type {number}
 */
global.BUCKET_MIN = 8000;

/**
 * The PathFinder cost for a tile where one of our creeps is (or we assume there is).
 * @type {number}
 */
global.PF_CREEP = 20;
/**
 * Default amount of minimal ticksToLive Screep can have, before it goes to renew.
 * This is only default value, that don't have to be used.
 * So it doesn't cover all Screeps.
 * @type {number}
 */
global.DEFAULT_MIN_LIFE_BEFORE_NEEDS_REFILL = 200;
global.MAX_TTL = 1400;

/**
 * An array of players whose creeps will be excluded from Room.prototype.hostileCreeps
 * and will be added to Room.prototype.alliedCreeps instead.
 * @type {string[]}
 */
global.alliedPlayers = [
	"TranceCake",
];

/**
 * This treshold defines which roles will be executed within a room, regardless of getUsed or bucket state.
 * Anything below the treshold will be executed, everything above is conditional.
 * @type {number}
 */
global.PRIORITY_TRESHOLD = 41;
/**
 * Priorities for Regular Room Creeps
 * @type {number}
 */
global.PRIORITY_CREEP           = -1;
global.PRIORITY_HARVESTER       = 10;
global.PRIORITY_MULE            = 20;
global.PRIORITY_UPGRADER        = 30;
global.PRIORITY_LINKER          = 40;
global.PRIORITY_MINER           = 50;
global.PRIORITY_REPAIR          = 60;
global.PRIORITY_BUILDER         = 70;
global.PRIORITY_SCIENTIST       = 80;
global.PRIORITY_BITER           = 30;

/**
 * Priorities for Assimilation Package Creeps
 * @type {number}
 */
global.PRIORITY_ASM_CLAIM       = 10;
global.PRIORITY_ASM_HARVESTER   = 20;
global.PRIORITY_ASM_MULE        = 30;
global.PRIORITY_ASM_BUILDER     = 40;

/**
 * Priorities for Warfare Package Creeps
 * @type {number}
 */
global.PRIORITY_WF_WARRIOR      = 10;
global.PRIORITY_WF_RANGER       = 20;
global.PRIORITY_WF_HEALER       = 30;

/**
 * Minimum homeRoom RCL values for Regular Room Creeps
 * @type {number}
 */
global.MINRCL_CREEP             = 0;
global.MINRCL_BUILDER           = 1;
global.MINRCL_HARVESTER         = 1;
global.MINRCL_MULE              = 1;
global.MINRCL_UPGRADER          = 1;
global.MINRCL_LINKER            = 5;
global.MINRCL_REPAIR            = 9;
global.MINRCL_MINER             = 6;
global.MINRCL_SCIENTIST         = 7;
global.MINRCL_BITER             = 5;

/**
 * Minimum homeRoom RCL values for Assimilation Package Creeps
 * @type {number}
 */
global.MINRCL_ASM_CLAIM         = 4;
global.MINRCL_ASM_HARVESTER     = 4;
global.MINRCL_ASM_MULE          = 4;
global.MINRCL_ASM_BUILDER       = 4;

/**
 * Minimum homeRoom RCL values for Warfare Package Creeps
 * @type {number}
 */
global.MINRCL_WF_WARRIOR        = 4;
global.MINRCL_WF_RANGER         = 4;
global.MINRCL_WF_HEALER         = 4;

global.BLACKLIST_SOURCES = [
	"af8ce260e6f676ef1f544211",
	"cb21e118236d8b2a3f28404d",
];

global.translateErrorCode = function(errorCode: number): string {
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
};

global.RESOURCE_TYPES = [
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
global.tradeTreshold = function(resourceType: string) {
	switch (resourceType) {
		case RESOURCE_ENERGY:
			return 0.15;
		case RESOURCE_ZYNTHIUM:
			return 1.2;
		case RESOURCE_OXYGEN:
			return 0.7;
		case RESOURCE_HYDROGEN:
			return 0.7;
		default:
			return undefined;
	}
};

/**
 * A list of resources that will be blacklisted during Terminal balancing
 * @type {string[]}
 */
global.TERMINAL_SKIP_BALANCE_RESOURCES = [
	RESOURCE_ENERGY,
	RESOURCE_POWER,
];
// Taken from:
// https://github.com/Sriep/screeps/blob/d307ac0e2ebf6b7c8ac1f0033baeed9679baa4da/building/lab.colours.js
global.labColors = {
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

global.findReagents = function(reaction: string): string[] {
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

global.getTowerRange = function(roomName: string): number {
	switch (roomName) {
		case "W6N42":
			return 21;
		case "W5N42":
			return 10;
		case "W7N44":
			return 21;
		case "W7N45":
			return 7;
		case "W6N49":
			return 50;
		default:
			return 50;
	}
};
