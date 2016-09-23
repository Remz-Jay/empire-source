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
	powerSpawn: StructurePowerSpawn;
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
	getPowerSpawn(): StructurePowerSpawn;
	getObserver(): StructureObserver;
	getLabReaction(): string;
	getLabReagents(): string[];
	addProperties(): void;
}

Room.prototype.setCostMatrix = function (costMatrix) {
	global.costMatrix[this.name] = costMatrix;
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
		_.union(this.myCreeps, this.alliedCreeps).forEach((creep: Creep) => {
			costMatrix.set(creep.pos.x, creep.pos.y, global.PF_CREEP);
		});
		this.hostileCreeps.forEach((creep: Creep) => {
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
	if (!ignoreRoomConfig && !!global.costMatrix[this.name]) {
		return global.costMatrix[this.name];
	}
	try {
		let costMatrix = (!!this.memory.costMatrix) ? PathFinder.CostMatrix.deserialize(this.memory.costMatrix) : undefined;
		if (!ignoreRoomConfig && !!costMatrix) {
			// console.log("Returning existing CostMatrix for room " + this.name);
			global.costMatrix[this.name] = costMatrix;
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
				if (!!site && (site.structureType === STRUCTURE_ROAD || site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_RAMPART)) {
					costs.set(site.pos.x, site.pos.y, 1);
				} else {
					costs.set(site.pos.x, site.pos.y, 0xff);
				}
			});
			if (!ignoreRoomConfig && !!this.roomConfig[this.name]) {
				this.roomConfig[this.name].forEach((obj: any) => {
					costs.set(obj.x, obj.y, obj.w);
				});
			}
			this.allStructures.forEach((structure: OwnedStructure) => {
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
			if (!ignoreRoomConfig) {
				this.setCostMatrix(costs);
			}
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
	return _.sum(this.containers, "storeCapacity");
};
Room.prototype.getEnergyInContainers = function () {
	return _.sum(this.containers, (c: StorageStructure) => c.store[RESOURCE_ENERGY]);
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
	this.hostileCreeps = _.difference(this.hostileCreeps, allies);
	return allies;
};
Room.prototype.getAllStructures = function(): Structure[] {
	return this.find(FIND_STRUCTURES) as Structure[];
	/*
	let allStructures: Structure[] = [];
	if (!global.structures) {
		global.structures = [];
	}
	if (!!this.memory.allStructures && _.isArray(this.memory.allStructures)) {
		if (_.isArray(global.structures[this.name]) && global.structures[this.name].length === this.memory.allStructures.length) {
			return global.structures[this.name];
		} else {
			allStructures = _.map(this.memory.allStructures, (id: string) => Game.getObjectById(id)) as Structure[];
		}
	} else {
		allStructures = this.find(FIND_STRUCTURES) as Structure[];
		this.memory.allStructures = [];
		this.memory.allStructures = _.map(allStructures, "id");
	}

	global.structures[this.name] = allStructures;
	return allStructures;
	*/
};
Room.prototype.getMyStructures = function(): OwnedStructure[] {
	return this.allStructures.filter((s: OwnedStructure) => !!s.my);
};
Room.prototype.getHostileStructures = function (): OwnedStructure[] {
	return this.allStructures.filter((s: OwnedStructure) =>
	!!s && undefined !== s.my && s.my === false && s.structureType !== STRUCTURE_CONTROLLER);
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
		}
	});
	if (boostLabs.length > 0) {
		this.myLabs = _.difference(this.myLabs, boostLabs);
	}
	return boostLabs;
};
Room.prototype.getFreeSpawn = function(): StructureSpawn {
	return this.mySpawns.find((s: StructureSpawn) => !s.isBusy) || _.sample(this.mySpawns);
};
Room.prototype.getAllConstructionSites = function(): ConstructionSite[] {
	let allConstructionSites: ConstructionSite[] = [];
	if (!!this.memory.allConstructionSites && _.isArray(this.memory.allConstructionSites)) {
		allConstructionSites = _.compact(_.map(this.memory.allConstructionSites, (id: string) => Game.getObjectById(id))) as ConstructionSite[];
	} else {
		allConstructionSites = this.find(FIND_CONSTRUCTION_SITES) as ConstructionSite[];
		this.memory.allConstructionSites = [];
		this.memory.allConstructionSites = _.map(allConstructionSites, "id");
	}
	return allConstructionSites;
};
Room.prototype.getMyConstructionSites = function(): ConstructionSite[] {
	return this.allConstructionSites.filter((cs: ConstructionSite) => !!cs && !!cs.my);
};
Room.prototype.getMinerals = function(): Mineral[] {
	let allMinerals: Mineral[] = [];
	if (!!this.memory.allMinerals && _.isArray(this.memory.allMinerals)) {
		allMinerals = _.compact(_.map(this.memory.allMinerals, (id: string) => Game.getObjectById(id))) as Mineral[];
	} else {
		allMinerals = this.find(FIND_MINERALS) as Mineral[];
		this.memory.allMinerals = _.map(allMinerals, "id");
	}
	return allMinerals;
};
Room.prototype.getSources = function(): Source[] {
	let allSources: Source[] = [];
	if (!!this.memory.allSources && _.isArray(this.memory.allSources)) {
		allSources = _.compact(_.map(this.memory.allSources, (id: string) => Game.getObjectById(id))) as Source[];
	} else {
		allSources = this.find(FIND_SOURCES) as Source[];
		this.memory.allSources = _.map(allSources, "id");
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
Room.prototype.getPowerSpawn = function(): StructurePowerSpawn {
	let sn = this.myStructures.filter((s: OwnedStructure) => s.structureType === STRUCTURE_POWER_SPAWN);
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
	if (global.time % 500 === 0) {
		delete this.memory.allSources;
		delete this.memory.allMinerals;
	}
	if (global.time % 50 === 1) {
		delete this.memory.allStructures;
		delete this.memory.allConstructionSites;
		delete this.memory.costMatrix;
		if (!!global.costMatrix && !!global.costMatrix[this.name]) {
			delete global.costMatrix[this.name];
		}
	}
	this.towerTargets = [];

	this.allStructures =        this.getAllStructures();
	this.allCreeps =            this.getAllCreeps();
	this.allConstructionSites = this.getAllConstructionSites();
	this.minerals =             this.getMinerals();
	this.sources =              this.getSources();

	this.myStructures =         (!!this.controller && !!this.controller.my && this.allStructures.length > 0) ? this.getMyStructures() : [];
	this.nuker =                (!!this.controller && this.controller.level === 8 && this.myStructures.length > 0) ? this.getNuker() : undefined;
	this.powerSpawn =           (!!this.controller && this.controller.level === 8 && this.myStructures.length > 0) ? this.getPowerSpawn() : undefined;
	this.observer =             (!!this.controller && this.controller.level === 8 && this.myStructures.length > 0) ? this.getObserver() : undefined;
	this.hostileStructures =    (!!this.controller && this.allStructures.length > 0) ? this.getHostileStructures() : [];
	this.mySpawns =             (!!this.controller && !!this.controller.my && this.allStructures.length > 0) ? this.getMySpawns() : [];
	this.myLabs =               (!!this.controller && !!this.controller.my && this.controller.level >= 6 && this.allStructures.length > 0) ? this.getMyLabs() : [];
	this.boostLabs =            (this.myLabs.length > 0) ? this.getBoostLabs() : [];
	this.labReaction =          (this.myLabs.length > 0) ? this.getLabReaction() : undefined;
	this.labReagents =          (!!this.labReaction) ? this.getLabReagents() : [];

	this.myCreeps =             (this.allCreeps.length > 0) ? this.getMyCreeps() : [];
	this.hostileCreeps =        (this.allCreeps.length > 0) ? this.getHostileCreeps() : [];
	this.alliedCreeps =         (this.hostileCreeps.length > 0) ? this.getAlliedCreeps() : [];

	this.myConstructionSites =  (this.allConstructionSites.length > 0) ? this.getMyConstructionSites() : [];

	this.containers =           (this.allStructures.length > 0) ? this.getContainers() : [];
	this.containerCapacityAvailable = (this.containers.length > 0) ? this.getContainerCapacityAvailable() : 0;
	this.energyInContainers =   (this.containers.length > 0) ? this.getEnergyInContainers() : 0;
	this.energyPercentage =     (this.containers.length > 0) ? this.getEnergyPercentage() : 0;
};
