declare type PathFinderGoal = { pos: RoomPosition, range: number }[];
declare type PathFinderPath = { path: RoomPosition[], ops: number };
declare type EnergyStructure = Extension | Spawn | Tower;
declare type StorageStructure = StructureStorage | StructureContainer | StructureTerminal;
declare type findRouteRoute = {exit: string; room: string; }
declare type findRouteArray = findRouteRoute[];

declare interface CreepStats  {
	roles: number;
	creeps: number;
}

declare interface CreepConfiguration {
	body: string[];
	name: string;
	properties: CreepProperties;
}
declare interface CreepProperties {
	role: string;
	homeRoom: string;
	homeSpawn: string;
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
	homeDistance: number;
	route: findRouteArray;
}

declare interface RemoteCreepProperties extends CreepProperties {
	config: RemoteRoomConfig;
}
declare interface AssimilationObject {
	targets: string[];
	config: {
		[roomName: string]: RemoteRoomConfig
	};
}
declare interface Memory {
	assimilation?: AssimilationObject;
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
	};
}

declare interface Game {
	profiler: any;
	assman: any;
}
