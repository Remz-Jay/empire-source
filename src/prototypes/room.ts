interface Room {
	costMatrix: CostMatrix;
	creepMatrix: CostMatrix;
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
	towerTargets: Creep|Structure[];
	labReaction: string;
	labReagents: string[];
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
	getLabReaction(): string;
	getLabReagents(): string[];
	addProperties(): void;
}

Room.prototype.setCostMatrix = function (costMatrix) {
	this.costMatrix = costMatrix;
	this.memory.costMatrix = costMatrix.serialize();
};

Room.prototype.setCreepMatrix = function (costMatrix) {
	this.creepMatrix = costMatrix;
	// this.memory.creepMatrix = costMatrix.serialize();
};

Room.prototype.getCreepMatrix = function () {
	try {
		if (!!this.creepMatrix) {
			return this.creepMatrix;
		}
		let costMatrix = this.getCostMatrix();
		// Avoid creeps in the room
		_.union(this.myCreeps, this.alliedCreeps).forEach(function (creep: Creep) {
			costMatrix.set(creep.pos.x, creep.pos.y, global.PF_CREEP);
		});
		this.hostileCreeps.forEach(function (creep: Creep) {
			costMatrix.set(creep.pos.x, creep.pos.y, 0xff);
		});
		// console.log("Returning NEW CreepMatrix for room " + this.name);
		this.setCreepMatrix(costMatrix);
		return costMatrix;
	} catch (e) {
		console.log(e.message, "Room.Prototype.getCreepMatrix", this.name);
		return new PathFinder.CostMatrix();
	}

};

Room.prototype.getCostMatrix = function (ignoreRoomConfig: boolean = false) {
	if (!!this.costMatrix) {
		return this.costMatrix;
	}
	try {
		let costMatrix = (!!this.memory.costMatrix) ? PathFinder.CostMatrix.deserialize(this.memory.costMatrix) : undefined;
		if (!!costMatrix) {
			// console.log("Returning existing CostMatrix for room " + this.name);
			this.costMatrix = costMatrix;
			return costMatrix;
		} else {
			this.roomConfig = {
				W7N44: [
					{x: 27, y: 30, w: global.PF_CREEP}, // container next to extension, keep free for mule to deliver energy.
				],
				W7N45: [
					{x: 48, y: 5, w: 0xff}, // SK near O source, avoid
					{x: 49, y: 5, w: 0xff}, // SK near O source, avoid
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
				W6N45: [],
			};
			if (this.name === "W6N45") {
				let positions: any[] = [];
				for (let i = 0; i < 18; i++) {
					for (let j = 5; j < 16; j++) {
						positions.push({x: i, y: j, w: 0xff});
					}
				}
				this.roomConfig.W6N45 = positions;
			}
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
			if (!ignoreRoomConfig && !!this.roomConfig[this.name]) {
				this.roomConfig[this.name].forEach((obj: any) => {
					costs.set(obj.x, obj.y, obj.w);
				});
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
				} else if (structure.structureType === STRUCTURE_CONTAINER) {
					costs.set(structure.pos.x, structure.pos.y, global.PF_CREEP); // Assume there's a harvester on the container
				}
			});
			let linkerFlag = Game.flags[this.name + "_LS"];
			if (!!linkerFlag) {
				costs.set(linkerFlag.pos.x, linkerFlag.pos.y, global.PF_CREEP); // Assume there's a linker on the spot
			}
			// console.log("Returning NEW CostMatrix for room " + this.name);
			this.setCostMatrix(costs);
			return costs;
		}
	} catch (e) {
		console.log("Room.prototype.getCostMatrix", this.name, e.message);
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
	let allies: Creep[] = this.hostileCreeps.filter((c: Creep) => _.includes(global.alliedPlayers, c.owner.username));
	allies.forEach((c: Creep) => this.hostileCreeps = _.pull(this.hostileCreeps, c));
	return allies;
};
Room.prototype.getNumberOfCreepsInRoom = function(): number {
	return this.myCreeps.length;
};
Room.prototype.getAllStructures = function(): Structure[] {
	return this.find(FIND_STRUCTURES) as Structure[];
/*	let allStructures: Structure[] = [];
	if (!global.structures) {
		global.structures = [];
	}
	if (!!this.memory.allStructures && _.isArray(this.memory.allStructures)) {
		if (_.isArray(global.structures[this.name]) && global.structures[this.name].length === this.memory.allStructures.length) {
			allStructures = global.structures[this.name];
		} else {
			this.memory.allStructures.forEach((s: string) => {
				let st = Game.getObjectById<Structure>(s);
				if (!!st) {
					allStructures.push(st);
				}
			});
		}
	} else {
		allStructures = this.find(FIND_STRUCTURES) as Structure[];
		this.memory.allStructures = [];
		allStructures.forEach((s: Structure) => this.memory.allStructures.push(s.id));
	}

	global.structures[this.name] = allStructures;
	return allStructures;*/
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
		if (!!flag && _.includes(flag.name, "_B")) {
			boostLabs.push(l);
			let reagent = global.labColors.resource(flag.color, flag.secondaryColor);
			global.boostReagents.push({room: this, reagent: reagent});
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
Room.prototype.getLabReaction = function(): string {
	if (!!Game.flags[this.name + "_LR"]) {
		let flag = Game.flags[this.name + "_LR"];
		if (!(flag.color === COLOR_WHITE && flag.secondaryColor === COLOR_RED)) { // Clean All
			return global.labColors.resource(flag.color, flag.secondaryColor);
		}
	}
	return undefined;
};
Room.prototype.getLabReagents = function(): string[] {
	if (!!this.labReaction) {
		return global.findReagents(this.labReaction);
	}
	return undefined;
};
Room.prototype.addProperties = function () {
	if (Game.time & 99) {
		delete this.memory.allSources;
		delete this.memory.allMinerals;
	}
	if (Game.time & 9) {
		delete this.memory.allStructures;
		delete this.memory.allConstructionSites;
		delete this.memory.costMatrix;
	}
	this.towerTargets = [];

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
	this.labReaction =          (!!this.controller && !!this.controller.my && this.myLabs.length > 0) ? this.getLabReaction() : undefined;
	this.labReagents =          (!!this.labReaction) ? this.getLabReagents() : [];

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
