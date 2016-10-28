declare type PathFinderItem = { pos: RoomPosition, range: number };
declare type PathFinderGoal = PathFinderItem[];
declare type PathFinderPath = { path: RoomPosition[], ops: number };
declare type GroupedStructures = { [structureType: string]: Structure[]};
declare type GroupedOwnedStructures = { [structureType: string]: OwnedStructure[]};
declare type EnergyStructure = Extension | Spawn | Tower;
declare type StorageStructure = StructureStorage | StructureContainer | StructureTerminal;
declare type findRouteRoute = {exit: string; room: string; }
declare type findRouteArray = findRouteRoute[];
declare type CreepSpawnDefinition = {body: string[], name?: string, memory?: any};
// declare var global: any;

declare interface CreepStats  {
	roles: number;
	creeps: number;
	perRole: any;
}

declare interface CreepConfiguration {
	body: string[];
	name: string;
	properties: CreepProperties;
}
declare interface CreepProperties {
	role: string;
	homeRoom: string;
	targetRoom?: string;
	target_link_id?: string;
	target_storage_id?: string;
	target_energy_dropoff_id?: string;
	target_energy_source_id?: string;
	target_source_id?: string;
	target_construction_site_id?: string;
	target_controller_id?: string;
}

declare interface StatsObject {
	[k: string]: any;
	rooms: {[k: string]: any};
	terminal: {[k: string]: any};
	spawns: {[k: string]: any};
	room: {[k: string]: any};
	reservedRoom: {[k: string]: any};
	sources: {[k: string]: any};
	minerals: {[k: string]: any};
}

declare interface ProfilerObject {
	[name: string]: any;
	filter: any;
	enabledTick: any;
	totalTime: any;
	map: any;
	type: any;
	disableTick: any;
}
declare interface RemoteRoomConfig {
	homeRoom: string;
	targetRoom: string;
	homeDistance?: number;
	route?: findRouteArray;
	claim?: boolean;
	hasController?: boolean;
	reserveOnly?: boolean;
	controllerTTL?: number;
}

declare interface TerminalTransaction {
	id: string;
	recipient: string;
	resource: string;
	description: string;
	totalAmount: number;
	sentAmount: number;
	transactions?: Transaction[];
}

declare interface RemoteCreepProperties extends CreepProperties {
	config: RemoteRoomConfig;
	container?: string;
}
declare interface AssimilationObject {
	targets: string[];
	config: {
		[roomName: string]: RemoteRoomConfig
	};
}

declare interface OffenseObject {
	targets: string[];
	config: {
		[roomName: string]: RemoteRoomConfig
	};
}
declare interface SquadRole {
	role: string;
	maxCreeps: number;
}
declare interface SquadConfig {
	roles: SquadRole[];
	wait?: boolean;
	target?: PowerBankMemory;
	source?: string;
	missionComplete?: boolean;
}

declare interface ResourceList {
	[resource: string]: number;
}
declare interface PowerBankMemory {
	power: number;
	decay: number;
	pos: RoomPosition;
	indexed: number;
	taken: boolean;
}
declare interface CreepStatsObject {
	fullHealth: {
		attack: number;
		dismantle: number;
		heal: number;
		rangedAttack: number;
		toughParts: number;
		toughReduction: number;
		hits: number;
	};
	current: {
		attack: number;
		dismantle: number;
		heal: number;
		rangedAttack: number;
		toughParts: number;
		toughReduction: number;
		hits: number;
	};
}

declare interface Memory {
	assimilation?: AssimilationObject;
	offense?: OffenseObject;
	stats: {
		[name: string]: any;
	};
	walls: {
		[name: string]: any;
	};
	ramparts: {
		[name: string]: any;
	};
	profiler: ProfilerObject;
	config: {
		[name: string]: {
			[name: string]: any;
		};
		Wall: {
			[name: string]: any;
		};
		Rampart: {
			[name: string]: any;
		};
		ResourceTargets: {
			[resourceName: string]: number;
		}
	};
	pathCache: {
		[from: string]: {
			[to: string]: string;
		}
	};
	matrixCache: {
		[room: string]: {
			t: number; // matrixTime
			m: string[]; // matrixData
			s: number; // scanTime
			cs: number; // number of Construction Sites
			st: number; // number of Structures
			a?: boolean; // owned by an allied player
			h?: boolean; // owned by a hostile player
		}
	};
	transactions: TerminalTransaction[];
	structures: {
		[id: string]: any;
	};
	sources: {
		[id: string]: any;
	};
	powerBanks: {[id: string]: PowerBankMemory};
	powerManager: {
		squads: SquadConfig[];
	};
}

declare interface Game {
	profiler: any;
	assman: any;
	offense: any;
}
declare namespace NodeJS {
	export interface Global {
		VERBOSE: boolean;
		CREEPSTATS: boolean;
		ROOMSTATS: boolean;
		DEBUG: boolean;
		MAX_HARVESTERS_PER_SOURCE: number;
		TIME_OFFSET: number;
		TERMINAL_ENERGY_MAX: number;
		TERMINAL_MAX: number;
		STORAGE_MIN: number;
		BUCKET_MIN: number;
		PF_CREEP: number;
		DEFAULT_MIN_LIFE_BEFORE_NEEDS_REFILL: number;
		MAX_TTL: number;
		PRIORITY_TRESHOLD: number;
		PRIORITY_CREEP: number;
		PRIORITY_HARVESTER: number;
		PRIORITY_MULE: number;
		PRIORITY_UPGRADER: number;
		PRIORITY_LINKER: number;
		PRIORITY_MINER: number;
		PRIORITY_REPAIR: number;
		PRIORITY_BUILDER: number;
		PRIORITY_SCIENTIST: number;
		PRIORITY_BITER: number;
		PRIORITY_DISMANTLER: number;
		PRIORITY_ASM_CLAIM: number;
		PRIORITY_ASM_HARVESTER: number;
		PRIORITY_ASM_MULE: number;
		PRIORITY_ASM_BUILDER: number;
		PRIORITY_WF_WARRIOR: number;
		PRIORITY_WF_RANGER: number;
		PRIORITY_WF_HEALER: number;
		MINRCL_CREEP: number;
		MINRCL_BUILDER: number;
		MINRCL_HARVESTER: number;
		MINRCL_MULE: number;
		MINRCL_UPGRADER: number;
		MINRCL_LINKER: number;
		MINRCL_REPAIR: number;
		MINRCL_MINER: number;
		MINRCL_SCIENTIST: number;
		MINRCL_BITER: number;
		MINRCL_DISMANTLER: number;
		MINRCL_ASM_CLAIM: number;
		MINRCL_ASM_HARVESTER: number;
		MINRCL_ASM_MULE: number;
		MINRCL_ASM_BUILDER: number;
		MINRCL_WF_WARRIOR: number;
		MINRCL_WF_RANGER: number;
		MINRCL_WF_HEALER: number;
		BLACKLIST_SOURCES: string[];
		MAX_POWER_DISTANCE: number;
		ROOM_BLACKLIST: string[];
		RESOURCE_TYPES: string[];
		STRUCTURES_ALL: string[];
		TERMINAL_SKIP_BALANCE_RESOURCES: string[];
		labColors: any;
		time: number;
		alliedPlayers: string[];
		sendRegistry: string[];
		boostReagents: {room: Room, reagent: string}[];
		labReactions: {room: Room, reaction: string, reagents: string[]}[];
		linkBlackList: string[];
		offense: any;
		assman: any;
		tickCache: {
			roles: any;
			creeps: any;
			rolesByRoom: any;
			storageLink: any;
			storageTower: any;
		};
		targetBlackList: {
			[role: string]: string[];
		};
		costMatrix: {
			[roomName: string]: CostMatrix;
		};
		translateErrorCode(errorCode: number): string;
		tradeTreshold(resourceType: string): number;
		findReagents(reaction: string): string[];
		getTowerRange(roomName: string): number;
		colorWrap(text: string, color: string): string;
		formatNumber(value: number): string;
		getColorBasedOnPercentage(thePercentage: number): string;
		hsv2rgb(h: number, s: number, v: number): string;
		planRoute(from: RoomPosition, to: RoomPosition): void;
		table(data: any[], widths?: number[]): string;
		coordinateToCharacter(thePos: RoomPosition|{x: number, y: number}): string;
		decodeCoordinate(theString: string, theIndex: number): {x: number, y: number};
		revStr(s: string): string;
		baseClamp(n: number, lower: number, upper: number): number;
		clamp(n: number, lower: number, upper: number): number;
		findDeals(): void;
		labReport(): void;
		resourceReport(): void;
		dumpResource(resource: string): void;
		transactionReport(numTransactions: number): void;
		addTransaction(resource: string, amount: number, recipient: string, description: string): void;
		transactionStatus(): void;
		setTarget(resourceName: string, target: number): void;
		gclCalc(): void;
		calculateRequiredEnergy(body: string[]): number;
		sortBodyParts(bodyParts: string[]): string[];
	}
}
