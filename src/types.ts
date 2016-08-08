declare type PathFinderGoal = { pos: RoomPosition, range: number }[];
declare type PathFinderPath = { path: RoomPosition[], ops: number };
declare type EnergyStructure = Extension | Spawn | Tower;
declare type StorageStructure = StructureStorage | StructureContainer | StructureTerminal;