interface Room {
	containers: Structure[];
	containerCapacityAvailable: number;
	energyInContainers: number;
	energyPercentage: number;
	allCreeps: Creep[];
	myCreeps: Creep[];
	hostileCreeps: Creep[];
	alliedCreeps: Creep[];
	numberOfCreeps: number;
	allStructures: Structure[];
	myStructures: OwnedStructure[];
	hostileStructures: OwnedStructure[];
	mySpawns: StructureSpawn[];
	myLabs: StructureLab[];
	boostLabs: StructureLab[];
	allConstructionSites: ConstructionSite[];
	myConstructionSites: ConstructionSite[];
	sources: Source[];
	minerals: Mineral[];
	nuker: StructureNuker;
	observer: StructureObserver;
	getReservedRoom(): Room;
	getReservedRoomName(): string;
	setReservedRoom(roomName: string|Room): void;
	setCostMatrix(costMatrix: CostMatrix): void;
	setCreepMatrix(costMatrix: CostMatrix): void;
	expireMatrices(): void;
	getCreepMatrix(): CostMatrix;
	getCostMatrix(ignoreRoomConfig?: boolean): CostMatrix;
	getContainers(): Structure[];
	getContainerCapacityAvailable(): number;
	getEnergyInContainers(): number;
	getEnergyPercentage(): number;
	getAllCreeps(): Creep[];
	getMyCreeps(): Creep[];
	getHostileCreeps(): Creep[];
	getAlliedCreeps(): Creep[];
	getNumberOfCreepsInRoom(): number;
	getAllStructures(): Structure[];
	getMyStructures(): OwnedStructure[];
	getHostileStructures(): OwnedStructure[];
	getMySpawns(): StructureSpawn[];
	getMyLabs(): StructureLab[];
	getBoostLabs(): StructureLab[];
	getFreeSpawn(): StructureSpawn;
	getAllConstructionSites(): ConstructionSite[];
	getMyConstructionSites(): ConstructionSite[];
	getSources(): Source[];
	getMinerals(): Mineral[];
	getNuker(): StructureNuker;
	getObserver(): StructureObserver;
	addProperties(): void;
}

Room.prototype.setCostMatrix = function (costMatrix) {
	this.memory.costMatrix = costMatrix.serialize();
};

Room.prototype.setCreepMatrix = function (costMatrix) {
	this.memory.creepMatrix = costMatrix.serialize();
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
				costMatrix.set(creep.pos.x, creep.pos.y, 0xff);
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

Room.prototype.getCostMatrix = function (ignoreRoomConfig: boolean = false) {
	this.roomConfig = {
		W7N44: [
			{x: 27, y: 30, w: 9}, // container next to extension, keep free for mule to deliver energy.
		],
		W6N42: [
			{x: 11, y: 19, w: 9}, // Narrow Path near Controller, route to W7N42
			{x: 12, y: 19, w: 9}, // Narrow Path near Controller, route to W7N42
			{x: 25, y: 5, w: 9}, // Narrow Path near upper Source in the corner.
		],
		W5N42: [
			{x: 37, y: 24, w: 9}, // Narrow Path in the tower bulwark
			{x: 38, y: 25, w: 9}, // Narrow Path in the tower bulwark
			{x: 43, y: 22, w: 9}, // Narrow Path, route to W4N42
			{x: 43, y: 23, w: 9}, // Narrow Path, route to W4N42
			{x: 43, y: 24, w: 9}, // Narrow Path, route to W4N42
		],
		W7N45: [
			{x: 48, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 49, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 48, y: 7, w: 0xff}, // SK near O source, avoid
			{x: 49, y: 7, w: 0xff}, // SK near O source, avoid
			{x: 48, y: 8, w: 0xff}, // SK near O source, avoid
			{x: 49, y: 8, w: 0xff}, // SK near O source, avoid
			{x: 48, y: 9, w: 0xff}, // SK near O source, avoid
			{x: 49, y: 9, w: 0xff}, // SK near O source, avoid
			{x: 48, y: 10, w: 0xff}, // SK near O source, avoid
			{x: 49, y: 10, w: 0xff}, // SK near O source, avoid
			{x: 48, y: 11, w: 0xff}, // SK near O source, avoid
			{x: 49, y: 11, w: 0xff}, // SK near O source, avoid
			{x: 48, y: 12, w: 0xff}, // SK near O source, avoid
			{x: 49, y: 12, w: 0xff}, // SK near O source, avoid
			{x: 48, y: 13, w: 0xff}, // SK near O source, avoid
			{x: 49, y: 13, w: 0xff}, // SK near O source, avoid
			{x: 48, y: 14, w: 0xff}, // SK near O source, avoid
			{x: 49, y: 14, w: 0xff}, // SK near O source, avoid
			{x: 48, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 49, y: 15, w: 0xff}, // SK near O source, avoid
		],
		W6N45: [
			{x: 0, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 1, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 2, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 7, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 8, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 9, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 10, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 11, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 12, y: 6, w: 0xff}, // SK near O source, avoid
			{x: 0, y: 7, w: 0xff}, // SK near O source, avoid
			{x: 1, y: 7, w: 0xff}, // SK near O source, avoid
			{x: 12, y: 7, w: 0xff}, // SK near O source, avoid
			{x: 0, y: 8, w: 0xff}, // SK near O source, avoid
			{x: 1, y: 8, w: 0xff}, // SK near O source, avoid
			{x: 12, y: 8, w: 0xff}, // SK near O source, avoid
			{x: 0, y: 9, w: 0xff}, // SK near O source, avoid
			{x: 1, y: 9, w: 0xff}, // SK near O source, avoid
			{x: 12, y: 9, w: 0xff}, // SK near O source, avoid
			{x: 0, y: 10, w: 0xff}, // SK near O source, avoid
			{x: 1, y: 10, w: 0xff}, // SK near O source, avoid
			{x: 12, y: 10, w: 0xff}, // SK near O source, avoid
			{x: 0, y: 11, w: 0xff}, // SK near O source, avoid
			{x: 1, y: 11, w: 0xff}, // SK near O source, avoid
			{x: 12, y: 11, w: 0xff}, // SK near O source, avoid
			{x: 0, y: 12, w: 0xff}, // SK near O source, avoid
			{x: 1, y: 12, w: 0xff}, // SK near O source, avoid
			{x: 12, y: 12, w: 0xff}, // SK near O source, avoid
			{x: 0, y: 13, w: 0xff}, // SK near O source, avoid
			{x: 1, y: 13, w: 0xff}, // SK near O source, avoid
			{x: 12, y: 13, w: 0xff}, // SK near O source, avoid
			{x: 0, y: 14, w: 0xff}, // SK near O source, avoid
			{x: 1, y: 14, w: 0xff}, // SK near O source, avoid
			{x: 12, y: 14, w: 0xff}, // SK near O source, avoid
			{x: 0, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 1, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 2, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 3, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 4, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 5, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 6, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 7, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 8, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 9, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 10, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 11, y: 15, w: 0xff}, // SK near O source, avoid
			{x: 12, y: 15, w: 0xff}, // SK near O source, avoid
		],
	};
	try {
		let costMatrix = (!!this.memory.costMatrix) ? PathFinder.CostMatrix.deserialize(this.memory.costMatrix) : undefined;
		if (!!costMatrix) {
			// console.log("Returning existing CostMatrix for room " + this.name);
			return costMatrix;
		} else {
			let costs = new PathFinder.CostMatrix();
			let hostileConstructionSites = _.difference(this.allConstructionSites, this.myConstructionSites);
			// Prefer walking on hostile construction sites
			hostileConstructionSites.forEach((s: ConstructionSite) => {
				costs.set(s.pos.x, s.pos.y, 1);
			});
			// But avoid our own.
			this.myConstructionSites.forEach(function (site: ConstructionSite) {
				costs.set(site.pos.x, site.pos.y, 10);
			});
			if (!ignoreRoomConfig) {
				_.each(this.roomConfig[this.name], obj => costs.set(obj.x, obj.y, obj.w));
			}
			this.allStructures.forEach(function (structure: OwnedStructure) {
				if (structure.structureType === STRUCTURE_ROAD) {
					// Favor roads over plain tiles
					costs.set(structure.pos.x, structure.pos.y, 1);
				} else if (structure.structureType !== STRUCTURE_CONTAINER &&
					(structure.structureType !== STRUCTURE_RAMPART)) {
					// Can't walk through non-walkable buildings
					costs.set(structure.pos.x, structure.pos.y, 0xff);
				} else if (structure.structureType === STRUCTURE_RAMPART && !structure.my) {
					// Avoid hostile ramparts
					costs.set(structure.pos.x, structure.pos.y, 0xff);
				}
			});
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
	return _.difference<Creep>(this.allCreeps, this.myCreeps);
};
Room.prototype.getAlliedCreeps = function(): Creep[] {
	let alliedPlayers: string[] = [
		"TranceCake",
	];
	let allies: Creep[] = this.hostileCreeps.filter((c: Creep) => alliedPlayers.indexOf(c.owner.username) !== -1);
	allies.forEach((c: Creep) => this.hostileCreeps = _.pull(this.hostileCreeps, c));
	return allies;
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
	return this.allStructures.filter((s: OwnedStructure) =>
	undefined !== s.my && s.my === false && s.structureType !== STRUCTURE_CONTROLLER);
};
Room.prototype.getMySpawns = function(): StructureSpawn[] {
	let spawns = this.myStructures.filter((s: Structure) => s.structureType === STRUCTURE_SPAWN);
	spawns.forEach((s: StructureSpawn) => {
		if (!!s.spawning) {
			s.isBusy = true;
		}
	});
	return spawns;
};
Room.prototype.getMyLabs = function(): StructureLab[] {
	return this.myStructures.filter((s: Structure) => s.structureType === STRUCTURE_LAB);
};
Room.prototype.getBoostLabs = function(): StructureLab[] {
	let boostLabs: StructureLab[] = [];
	this.myLabs.forEach((l: StructureLab) => {
		let flag = l.pos.lookFor<Flag>(LOOK_FLAGS).shift();
		if (!!flag && flag.name.indexOf("_B") !== -1) {
			boostLabs.push(l);
			// console.log(`Room.prototype.getBoostLabs found ${flag.name} as boostLab in ${this.name}`, this.myLabs.length, boostLabs.length);
		}
	});
	if (boostLabs.length > 0) {
		boostLabs.forEach((l: StructureLab) => this.myLabs = _.pull(this.myLabs, l));
/*		this.myLabs.forEach((ml: StructureLab) => console.log(ml.id));
		console.log("------------------");
		boostLabs.forEach((bl: StructureLab) => console.log(bl.id));*/
	}
	return boostLabs;
};
Room.prototype.getFreeSpawn = function(): StructureSpawn {
	return this.mySpawns.find((s: StructureSpawn) => !s.isBusy) || _.sample(this.mySpawns);
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
Room.prototype.getNuker = function(): StructureNuker {
	let sn = this.myStructures.filter((s: OwnedStructure) => s.structureType === STRUCTURE_NUKER);
	if (sn.length > 0) {
		return sn.pop();
	} else {
		return undefined;
	}
};
Room.prototype.getObserver = function(): StructureObserver {
	let sn = this.myStructures.filter((s: OwnedStructure) => s.structureType === STRUCTURE_OBSERVER);
	if (sn.length > 0) {
		return sn.pop();
	} else {
		return undefined;
	}
};
Room.prototype.addProperties = function () {
	if (Game.time % 100 === 0) {
		delete this.memory.allSources;
		delete this.memory.allMinerals;
	}
	if (Game.time % 10 === 0) {
		delete this.memory.allStructures;
		delete this.memory.allConstructionSites;
		delete this.memory.costMatrix;
	}

	delete this.memory.creepMatrix;

	this.allStructures =        this.getAllStructures();
	this.allCreeps =            this.getAllCreeps();
	this.allConstructionSites = this.getAllConstructionSites();
	this.minerals =             this.getMinerals();
	this.sources =              this.getSources();

	this.myStructures =         (!!this.controller && !!this.controller.my && this.allStructures.length > 0) ? this.getMyStructures() : [];
	this.nuker =                (!!this.controller && this.controller.level === 8 && this.myStructures.length > 0) ? this.getNuker() : undefined;
	this.observer =             (!!this.controller && this.controller.level === 8 && this.myStructures.length > 0) ? this.getObserver() : undefined;
	this.hostileStructures =    (!!this.controller && this.allStructures.length > 0) ? this.getHostileStructures() : [];
	this.mySpawns =             (!!this.controller && !!this.controller.my && this.allStructures.length > 0) ? this.getMySpawns() : [];
	this.myLabs =               (!!this.controller && !!this.controller.my && this.controller.level >= 6 && this.allStructures.length > 0) ? this.getMyLabs() : [];
	this.boostLabs =            (!!this.controller && !!this.controller.my && this.myLabs.length > 0) ? this.getBoostLabs() : [];

	this.myCreeps =             (this.allCreeps.length > 0) ? this.getMyCreeps() : [];
	this.numberOfCreeps =       (this.myCreeps.length > 0) ? this.getNumberOfCreepsInRoom() : 0;
	this.hostileCreeps =        (this.allCreeps.length > 0) ? this.getHostileCreeps() : [];
	this.alliedCreeps =         (this.hostileCreeps.length > 0) ? this.getAlliedCreeps() : [];

	this.myConstructionSites =  (this.allConstructionSites.length > 0) ? this.getMyConstructionSites() : [];

	this.containers =           (this.allStructures.length > 0) ? this.getContainers() : [];
	this.containerCapacityAvailable = (this.containers.length > 0) ? this.getContainerCapacityAvailable() : 0;
	this.energyInContainers =   (this.containers.length > 0) ? this.getEnergyInContainers() : 0;
	this.energyPercentage =     (this.containers.length > 0) ? this.getEnergyPercentage() : 0;
};
