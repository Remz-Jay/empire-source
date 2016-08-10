declare type PathFinderGoal = { pos: RoomPosition, range: number }[];
declare type PathFinderPath = { path: RoomPosition[], ops: number };
declare type EnergyStructure = Extension | Spawn | Tower;
declare type StorageStructure = StructureStorage | StructureContainer | StructureTerminal;

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
