interface Room {
	containers: Structure[];
	containerCapacityAvailable: number;
	energyInContainers: number;
	energyPercentage: number;
	allCreeps: Creep[];
	myCreeps: Creep[];
	hostileCreeps: Creep[];
	numberOfCreeps: number;
	allStructures: Structure[];
	myStructures: OwnedStructure[];
	hostileStructures: OwnedStructure[];
	mySpawns: StructureSpawn[];
	allConstructionSites: ConstructionSite[];
	myConstructionSites: ConstructionSite[];
	sources: Source[];
	minerals: Mineral[];
	getReservedRoom(): Room;
	getReservedRoomName(): string;
	setReservedRoom(roomName: string|Room): void;
	setCostMatrix(costMatrix: CostMatrix): void;
	setCreepMatrix(costMatrix: CostMatrix): void;
	expireMatrices(): void;
	getCreepMatrix(): CostMatrix;
	getCostMatrix(): CostMatrix;
	getContainers(): Structure[];
	getContainerCapacityAvailable(): number;
	getEnergyInContainers(): number;
	getEnergyPercentage(): number;
	getAllCreeps(): Creep[];
	getMyCreeps(): Creep[];
	getHostileCreeps(): Creep[];
	getNumberOfCreepsInRoom(): number;
	getAllStructures(): Structure[];
	getMyStructures(): OwnedStructure[];
	getHostileStructures(): OwnedStructure[];
	getMySpawns(): StructureSpawn[];
	getFreeSpawn(): StructureSpawn;
	getAllConstructionSites(): ConstructionSite[];
	getMyConstructionSites(): ConstructionSite[];
	getSources(): Source[];
	getMinerals(): Mineral[];
	addProperties(): void;
	reloadCache(): void;
}
Room.prototype.getReservedRoom = function () {
	if (!!this.memory.reservedRoom && !!Game.rooms[this.memory.reservedRoom]) {
		return Game.rooms[this.memory.reservedRoom];
	} else {
		return undefined;
	}
};

Room.prototype.getReservedRoomName = function () {
	if (!!this.memory.reservedRoom) {
		return this.memory.reservedRoom;
	} else {
		return undefined;
	}
};

Room.prototype.setReservedRoom = function (roomName) {
	if (_.isString(roomName)) {
		this.memory.reservedRoom = roomName;
	} else if (roomName instanceof Room) {
		this.memory.reservedRoom = roomName.name;
	}
};

Room.prototype.setCostMatrix = function (costMatrix) {
	this.memory.costMatrix = costMatrix.serialize();
};

Room.prototype.setCreepMatrix = function (costMatrix) {
	this.memory.creepMatrix = costMatrix.serialize();
};

Room.prototype.expireMatrices = function () {
	delete this.memory.creepMatrix;
	delete this.memory.costMatrix;
};

Room.prototype.getCreepMatrix = function () {
	try {
		let creepMatrix = (!!this.memory.creepMatrix) ? PathFinder.CostMatrix.deserialize(this.memory.creepMatrix) : undefined;
		if (!!creepMatrix) {
			// console.log("Returning existing CreepMatrix for room " + this.name);
			return creepMatrix;
		} else {
			let costMatrix = this.getCostMatrix();
			// Avoid creeps in the room
			this.allCreeps.forEach(function (creep: Creep) {
				costMatrix.set(creep.pos.x, creep.pos.y, 100);
			});
			// console.log("Returning NEW CreepMatrix for room " + this.name);
			this.setCreepMatrix(costMatrix);
			return costMatrix;
		}
	} catch (e) {
		console.log(e.message, "Room.Prototype.getCreepMatrix", this.name);
		return new PathFinder.CostMatrix();
	}

};

Room.prototype.getCostMatrix = function () {
	this.roomConfig = {
		W7N44: [
			{x: 27, y: 30, w: 20}, // container next to extension, keep free for mule to deliver energy.
		],
		W6N42: [
			{x: 11, y: 19, w: 20}, // Narrow Path near Controller, route to W7N42
			{x: 12, y: 19, w: 20}, // Narrow Path near Controller, route to W7N42
		],
		W5N42: [
			{x: 37, y: 24, w: 20}, // Narrow Path in the tower bulwark
			{x: 38, y: 25, w: 20}, // Narrow Path in the tower bulwark
			{x: 43, y: 22, w: 20}, // Narrow Path, route to W4N42
			{x: 43, y: 23, w: 20}, // Narrow Path, route to W4N42
			{x: 43, y: 24, w: 20}, // Narrow Path, route to W4N42
		],
	};
	try {
		let costMatrix = (!!this.memory.costMatrix) ? PathFinder.CostMatrix.deserialize(this.memory.costMatrix) : undefined;
		if (!!costMatrix) {
			// console.log("Returning existing CostMatrix for room " + this.name);
			return costMatrix;
		} else {
			let costs = new PathFinder.CostMatrix();
			this.allStructures.forEach(function (structure: Structure) {
				if (structure.structureType === STRUCTURE_ROAD) {
					// Favor roads over plain tiles
					costs.set(structure.pos.x, structure.pos.y, 1);
				} else if (structure.structureType !== STRUCTURE_CONTAINER &&
					(structure.structureType !== STRUCTURE_RAMPART)) {
					// Can't walk through non-walkable buildings
					costs.set(structure.pos.x, structure.pos.y, 0xff);
				}
			});
			this.allConstructionSites.forEach(function (site: ConstructionSite) {
				costs.set(site.pos.x, site.pos.y, 100);
			});
			_.each(this.roomConfig[this.name], obj => costs.set(obj.x, obj.y, obj.w));
			// console.log("Returning NEW CostMatrix for room " + this.name);
			this.setCostMatrix(costs);
			return costs;
		}
	} catch (e) {
		console.log(JSON.stringify(e), "Room.prototype.getCostMatrix", this.name);
		return new PathFinder.CostMatrix();
	}
};

Room.prototype.getContainers = function (): Structure[] {
	return this.allStructures.filter((s: Structure) => s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE);
};
Room.prototype.getContainerCapacityAvailable = function () {
	let total = 0;
	_.each(this.containers, function (c) {
		total += c.storeCapacity;
	});
	return total;
};
Room.prototype.getEnergyInContainers = function () {
	let total = 0;
	_.each(this.containers, function (c) {
		total += c.store[RESOURCE_ENERGY];
	});
	return total;
};
Room.prototype.getEnergyPercentage = function () {
	return _.floor(this.energyInContainers / (this.containerCapacityAvailable / 100));
};
Room.prototype.getAllCreeps = function(): Creep[] {
	return this.find(FIND_CREEPS);
};
Room.prototype.getMyCreeps = function(): Creep[] {
	return this.allCreeps.filter((c: Creep) => !!c.my);
};
Room.prototype.getHostileCreeps = function(): Creep[] {
	return this.allCreeps.filter((c: Creep) => !c.my);
};
Room.prototype.getNumberOfCreepsInRoom = function(): number {
	return this.myCreeps.length;
};
Room.prototype.getAllStructures = function(): Structure[] {
	let allStructures: Structure[] = [];
	if (!!this.memory.allStructures && _.isArray(this.memory.allStructures)) {
		this.memory.allStructures.forEach((s: string) => {
			let st = Game.getObjectById<Structure>(s);
			if (!!st) {
				allStructures.push(st);
			}
		});
	} else {
		allStructures = this.find(FIND_STRUCTURES) as Structure[];
		this.memory.allStructures = [];
		allStructures.forEach((s: Structure) => this.memory.allStructures.push(s.id));
	}
	return allStructures;
};
Room.prototype.getMyStructures = function(): OwnedStructure[] {
	return this.allStructures.filter((s: OwnedStructure) => !!s.my);
};
Room.prototype.getHostileStructures = function (): OwnedStructure[] {
	return this.allStructures.filter((s: OwnedStructure) => s.hasOwnProperty("my") && s.my === false);
};
Room.prototype.getMySpawns = function(): StructureSpawn[] {
	return this.myStructures.filter((s: Structure) => s.structureType === STRUCTURE_SPAWN);
};
Room.prototype.getFreeSpawn = function(): StructureSpawn {
	return this.mySpawns.find((s: StructureSpawn) => !s.isBusy) || this.mySpawns[0];
};
Room.prototype.getAllConstructionSites = function(): ConstructionSite[] {
	let allConstructionSites: ConstructionSite[] = [];
	if (!!this.memory.allConstructionSites && _.isArray(this.memory.allConstructionSites)) {
		this.memory.allConstructionSites.forEach((s: string) => {
			let cs = Game.getObjectById<ConstructionSite>(s);
			if (!!cs) {
				allConstructionSites.push(cs);
			}
		});
	} else {
		allConstructionSites = this.find(FIND_CONSTRUCTION_SITES) as ConstructionSite[];
		this.memory.allConstructionSites = [];
		allConstructionSites.forEach((s: ConstructionSite) => this.memory.allConstructionSites.push(s.id));
	}
	return allConstructionSites;
};
Room.prototype.getMyConstructionSites = function(): ConstructionSite[] {
	return this.allConstructionSites.filter((cs: ConstructionSite) => !!cs.my);
};
Room.prototype.getMinerals = function(): Mineral[] {
	let allMinerals: Mineral[] = [];
	if (!!this.memory.allMinerals && _.isArray(this.memory.allMinerals)) {
		this.memory.allMinerals.forEach((s: string) => allMinerals.push(Game.getObjectById<Mineral>(s)));
	} else {
		allMinerals = this.find(FIND_MINERALS) as Mineral[];
		this.memory.allMinerals = [];
		allMinerals.forEach((s: Mineral) => this.memory.allMinerals.push(s.id));
	}
	return allMinerals;
};
Room.prototype.getSources = function(): Source[] {
	let allSources: Source[] = [];
	if (!!this.memory.allSources && _.isArray(this.memory.allSources)) {
		this.memory.allSources.forEach((s: string) => allSources.push(Game.getObjectById<Source>(s)));
	} else {
		allSources = this.find(FIND_SOURCES) as Source[];
		this.memory.allSources = [];
		allSources.forEach((s: Source) => this.memory.allSources.push(s.id));
	}
	return allSources;
};
Room.prototype.addProperties = function () {
	if (Game.time % 100 === 0) {
		delete this.memory.allSources;
		delete this.memory.allMinerals;
	}
	if (Game.time % 10 === 0) {
		delete this.memory.allStructures;
		delete this.memory.allConstructionSites;
		// TODO: Might have to split this to creep every tick and cost every n ticks.
		delete this.memory.costMatrix;
	}
	delete this.memory.creepMatrix;
	this.allStructures = this.getAllStructures();
	this.allCreeps = this.getAllCreeps();
	this.allConstructionSites = this.getAllConstructionSites();
	this.minerals = this.getMinerals();
	this.sources = this.getSources();

	this.myStructures = (!!this.controller && !!this.controller.my && this.allStructures.length > 0) ? this.getMyStructures() : [];
	this.hostileStructures = (!!this.controller && this.allStructures.length > 0) ? this.getHostileStructures() : [];
	this.mySpawns = (!!this.controller && !!this.controller.my) ? this.getMySpawns() : [];

	this.myCreeps = (this.allCreeps.length > 0) ? this.getMyCreeps() : [];
	this.numberOfCreeps = (this.myCreeps.length > 0) ? this.getNumberOfCreepsInRoom() : 0;
	this.hostileCreeps = (this.allCreeps.length > 0) ? this.getHostileCreeps() : [];

	this.myConstructionSites = (this.allConstructionSites.length > 0) ? this.getMyConstructionSites() : [];

	this.containers = (this.allStructures.length > 0) ? this.getContainers() : [];
	this.containerCapacityAvailable = (this.containers.length > 0) ? this.getContainerCapacityAvailable() : 0;
	this.energyInContainers = (this.containers.length > 0) ? this.getEnergyInContainers() : 0;
	this.energyPercentage = (this.containers.length > 0) ? this.getEnergyPercentage() : 0;
};

Room.prototype.reloadCache = function(): void {
	switch (Game.time % 4) {
		case 0:
			delete this.memory.allStructures;
			this.allStructures = this.getAllStructures();
			this.myStructures = (!!this.controller && !!this.controller.my && this.allStructures.length > 0) ? this.getMyStructures() : [];
			this.mySpawns = (!!this.controller && !!this.controller.my) ? this.getMySpawns() : [];
			this.hostileStructures = (!!this.controller && this.allStructures.length > 0) ? this.getHostileStructures() : [];
			this.containers = (this.allStructures.length > 0) ? this.getContainers() : [];
			break;
		case 1:
			delete this.memory.allConstructionSites;
			this.allConstructionSites = this.getAllConstructionSites();
			this.myConstructionSites = (this.allConstructionSites.length > 0) ? this.getMyConstructionSites() : [];
			break;
		case 2:
			// TODO: Might have to split this to creep every tick and cost every n ticks.
			this.expireMatrices();
			break;
		case 3:
			delete this.memory.allMinerals;
			this.minerals = this.getMinerals();
			break;
		default:
			throw new Error("Room.prototype.ModuloException");
	}
	this.containerCapacityAvailable = (this.containers.length > 0) ? this.getContainerCapacityAvailable() : 0;
	this.energyInContainers = (this.containers.length > 0) ? this.getEnergyInContainers() : 0;
	this.energyPercentage = (this.containers.length > 0) ? this.getEnergyPercentage() : 0;

	this.allCreeps = this.getAllCreeps();
	this.myCreeps = (this.allCreeps.length > 0) ? this.getMyCreeps() : [];
	this.numberOfCreeps = (this.myCreeps.length > 0) ? this.getNumberOfCreepsInRoom() : 0;
	this.hostileCreeps = (this.allCreeps.length > 0) ? this.getHostileCreeps() : [];
};
