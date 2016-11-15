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
	groupedStructures: GroupedStructures;
	myStructures: OwnedStructure[];
	myGroupedStructures: GroupedOwnedStructures;
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
	flags: Flag[];
	weakestWall: StructureWall;
	weakestRampart: StructureRampart;
	my: boolean;
	// spawnQueue: CreepSpawnDefinition[];
	// addToSpawnQueue(body: string[], name?: string, memory?: any, priority?: boolean): boolean;
	// getCreepToSpawn(): CreepSpawnDefinition;
	getReservedRoom(): Room;
	getReservedRoomName(): string;
	setReservedRoom(roomName: string|Room): void;
	setCostMatrix(costMatrix: CostMatrix, pass: string, nopass: string): void;
	setCreepMatrix(costMatrix: CostMatrix): void;
	expireMatrices(): void;
	getCreepMatrix(): CostMatrix;
	getCostMatrix(ignoreRoomConfig?: boolean, refreshOnly?: boolean): CostMatrix;
	getContainers(): Structure[];
	getContainerCapacityAvailable(): number;
	getEnergyInContainers(): number;
	getEnergyPercentage(): number;
	getAllCreeps(): Creep[];
	getMyCreeps(): Creep[];
	getHostileCreeps(): Creep[];
	getAlliedCreeps(): Creep[];
	getAllStructures(): Structure[];
	groupAllStructures(): GroupedStructures;
	getMyStructures(): OwnedStructure[];
	groupMyStructures(): GroupedOwnedStructures;
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
	setLabReaction(reaction: string): boolean;
	stopLabReaction(): boolean;
	getLabReagents(): string[];
	addProperties(): void;
	observe(): void;
	openRamparts(): void;
	closeRamparts(): void;
}

Room.prototype.setCostMatrix = function (costMatrix: CostMatrix, nopass: string, pass: string) {
	global.costMatrix[this.name] = costMatrix;
	if (!Memory.matrixCache[this.name]) {
		Memory.matrixCache[this.name] = {
			t: 0,
			s: Game.time,
			m: [],
			cs: 0,
			st: 0,
		};
	}
	Memory.matrixCache[this.name].m[0] = nopass;
	Memory.matrixCache[this.name].m[1] = pass;
	Memory.matrixCache[this.name].t = Game.time;
	Memory.matrixCache[this.name].st = this.allStructures.length;
	Memory.matrixCache[this.name].cs = this.allConstructionSites.length;
};

Room.prototype.setCreepMatrix = function (costMatrix) {
	this.creepMatrix = costMatrix;
};

Room.prototype.getCreepMatrix = function () {
	try {
		if (!!this.creepMatrix) {
			return this.creepMatrix;
		}
		const costMatrix = this.getCostMatrix();
		let creepMatrix = costMatrix.clone();
		// Avoid creeps in the room
		_.union(this.myCreeps, this.alliedCreeps).forEach((creep: Creep) => {
			creepMatrix.set(creep.pos.x, creep.pos.y, global.PF_CREEP);
		});
		this.hostileCreeps.forEach((creep: Creep) => {
			creepMatrix.set(creep.pos.x, creep.pos.y, 0xff);
		});
		// console.log("Returning NEW CreepMatrix for room " + this.name);
		this.setCreepMatrix(creepMatrix);
		return creepMatrix;
	} catch (e) {
		console.log(e.stack, "Room.Prototype.getCreepMatrix", this.name);
		return new PathFinder.CostMatrix();
	}

};

Room.prototype.getCostMatrix = function (ignoreRoomConfig: boolean = false, refreshOnly: boolean = false): CostMatrix {
	let cacheValid: boolean = false;
	let t = Game.time - _.get(Memory.matrixCache, `${this.name}.t`, Infinity);
	let cacheTTL: number =  (1500 - t) || 0;
	if (!ignoreRoomConfig && cacheTTL > 0) {
		cacheValid = true;
	}
	if (_.get(Memory.matrixCache, `${this.name}.st`, 0) !== this.allStructures.length) {
		cacheValid = false;
	}
	if (_.get(Memory.matrixCache, `${this.name}.cs`, 0) !== this.allConstructionSites.length) {
		cacheValid = false;
	}
	if (cacheValid && refreshOnly) {
		return;
	}
	if (cacheValid && !!global.costMatrix[this.name]) {
		// console.log("Returning global cached matrix for " + this.name + ` (${cacheTTL})`);
		return global.costMatrix[this.name];
	}
	try {
		if (cacheValid
			&& !!Memory.matrixCache[this.name]
			&& _.isString(Memory.matrixCache[this.name].m[0])
			&& _.isString(Memory.matrixCache[this.name].m[1])
		) {
			let costMatrix = new PathFinder.CostMatrix();
			for (let i = 0; i < Memory.matrixCache[this.name].m[0].length; i++) {
				let pos = global.decodeCoordinate(Memory.matrixCache[this.name].m[0], i);
				costMatrix.set(pos.x, pos.y, 0xff);
			}
			for (let i = 0; i < Memory.matrixCache[this.name].m[1].length; i++) {
				let pos = global.decodeCoordinate(Memory.matrixCache[this.name].m[1], i);
				costMatrix.set(pos.x, pos.y, 1);
			}
			global.costMatrix[this.name] = costMatrix;
			console.log("Returning memory cached matrix for " + this.name + ` (${cacheTTL})`);
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
			let passString: string = "";
			let nopassString: string = "";
			const hostileConstructionSites = _.difference(this.allConstructionSites, this.myConstructionSites);
			// Prefer walking on hostile construction sites
			hostileConstructionSites.forEach((s: ConstructionSite) => {
				costs.set(s.pos.x, s.pos.y, 1);
				passString += global.coordinateToCharacter(s.pos);
			});
			// But avoid our own.
			this.myConstructionSites.forEach(function (site: ConstructionSite) {
				if (!!site && (site.structureType === STRUCTURE_ROAD || site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_RAMPART)) {
					costs.set(site.pos.x, site.pos.y, 1);
					passString += global.coordinateToCharacter(site.pos);
				} else {
					costs.set(site.pos.x, site.pos.y, 0xff);
					nopassString += global.coordinateToCharacter(site.pos);
				}
			});

			this.allStructures.forEach((structure: OwnedStructure) => {
				if (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) {
					// Favor roads over plain tiles
					costs.set(structure.pos.x, structure.pos.y, 1);
					passString += global.coordinateToCharacter(structure.pos);
				} else if (structure.structureType !== STRUCTURE_RAMPART) {
					// Can't walk through non-walkable buildings
					costs.set(structure.pos.x, structure.pos.y, 0xff);
					nopassString += global.coordinateToCharacter(structure.pos);
				} else if (structure.structureType === STRUCTURE_RAMPART && !structure.my) {
					// Avoid hostile ramparts
					costs.set(structure.pos.x, structure.pos.y, 0xff);
					nopassString += global.coordinateToCharacter(structure.pos);
					// NOTE: we do not add our own ramparts. If a rampart is on a road or structure the position is already there,
					// and if it's on a plain/swamp, the terrain data does not change.
				}
			});

			if (!ignoreRoomConfig && !!this.roomConfig[this.name]) {
				this.roomConfig[this.name].forEach((obj: any) => {
					costs.set(obj.x, obj.y, obj.w);
					if (obj.w === 0xff) {
						nopassString += global.coordinateToCharacter({x: obj.x, y: obj.y});
					} else {
						passString += global.coordinateToCharacter({x: obj.x, y: obj.y});
					}
				});
			}
			const linkerFlag = Game.flags[this.name + "_LS"];
			if (!!linkerFlag) {
				costs.set(linkerFlag.pos.x, linkerFlag.pos.y, global.PF_CREEP); // Assume there's a linker on the spot
			}
			// console.log("Returning NEW CostMatrix for room " + this.name);
			if (!ignoreRoomConfig) {
				this.setCostMatrix(costs, nopassString, passString);
			}
			console.log("Returning new matrix for " + this.name);
			return costs;
		}
	} catch (e) {
		console.log("Room.prototype.getCostMatrix", this.name, e.stack);
		return new PathFinder.CostMatrix();
	}
};

Room.prototype.getContainers = function (): Structure[] {
	return _.union(this.groupedStructures[STRUCTURE_CONTAINER], this.groupedStructures[STRUCTURE_STORAGE]) as Structure[];
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
	const allies: Creep[] = this.hostileCreeps.filter((c: Creep) => _.includes(global.alliedPlayers, c.owner.username));
	this.hostileCreeps = _.difference(this.hostileCreeps, allies);
	return allies;
};
Room.prototype.getAllStructures = function(): Structure[] {
	return this.find(FIND_STRUCTURES) as Structure[];
};
Room.prototype.groupAllStructures = function(): GroupedStructures {
	let gs = _.groupBy(this.allStructures, "structureType") as GroupedStructures;
	global.STRUCTURES_ALL.forEach((s: string) => {
		if (!gs[s]) {
			gs[s] = [];
		}
	});
	return gs;
};
Room.prototype.getMyStructures = function(): OwnedStructure[] {
	return this.allStructures.filter((s: OwnedStructure) => !!s.my);
};
Room.prototype.groupMyStructures = function(): GroupedOwnedStructures {
	let gs = _.groupBy(this.myStructures, "structureType") as GroupedOwnedStructures;
	global.STRUCTURES_ALL.forEach((s: string) => {
		if (!gs[s]) {
			gs[s] = [];
		}
	});
	return gs;
};
Room.prototype.getHostileStructures = function (): OwnedStructure[] {
	return this.allStructures.filter((s: OwnedStructure) =>
	!!s && undefined !== s.my && s.my === false && s.structureType !== STRUCTURE_CONTROLLER);
};
Room.prototype.getMySpawns = function(): StructureSpawn[] {
	const spawns = this.myGroupedStructures[STRUCTURE_SPAWN];
	spawns.forEach((s: StructureSpawn) => {
		if (!!s.spawning) {
			s.isBusy = true;
		}
	});
	return spawns;
};
Room.prototype.getMyLabs = function(): StructureLab[] {
	return this.myGroupedStructures[STRUCTURE_LAB];
};
Room.prototype.getBoostLabs = function(): StructureLab[] {
	let boostLabs: StructureLab[] = [];
	this.myLabs.forEach((l: StructureLab) => {
		const flag = l.pos.lookFor<Flag>(LOOK_FLAGS).shift();
		if (!!flag && _.includes(flag.name, "_B")) {
			boostLabs.push(l);
			const reagent = global.labColors.resource(flag.color, flag.secondaryColor);
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
	return this.find(FIND_CONSTRUCTION_SITES);
};
Room.prototype.getMyConstructionSites = function(): ConstructionSite[] {
	return this.allConstructionSites.filter((cs: ConstructionSite) => !!cs && !!cs.my);
};
Room.prototype.getMinerals = function(): Mineral[] {
	return this.find(FIND_MINERALS);
};
Room.prototype.getSources = function(): Source[] {
	return this.find(FIND_SOURCES);
};
Room.prototype.getNuker = function(): StructureNuker {
	const sn = this.myGroupedStructures[STRUCTURE_NUKER];
	if (sn.length > 0) {
		return _.first(sn) as StructureNuker;
	} else {
		return undefined;
	}
};
Room.prototype.getPowerSpawn = function(): StructurePowerSpawn {
	const sn = this.myGroupedStructures[STRUCTURE_POWER_SPAWN];
	if (sn.length > 0) {
		return _.first(sn) as StructurePowerSpawn;
	} else {
		return undefined;
	}
};
Room.prototype.getObserver = function(): StructureObserver {
	const sn = this.myGroupedStructures[STRUCTURE_OBSERVER];
	if (sn.length > 0) {
		return _.first(sn) as StructureObserver;
	} else {
		return undefined;
	}
};
Room.prototype.getLabReaction = function(): string {
	if (!!Game.flags[this.name + "_LR"]) {
		const flag = Game.flags[this.name + "_LR"];
		if (!(flag.color === COLOR_WHITE && flag.secondaryColor === COLOR_RED)) { // Clean All
			return global.labColors.resource(flag.color, flag.secondaryColor);
		}
	}
	return undefined;
};
Room.prototype.setLabReaction = function(reaction: string): boolean {
	if (!!Game.flags[this.name + "_LR"] && RESOURCES_ALL.indexOf(reaction) !== -1) {
		const flag = Game.flags[this.name + "_LR"];
		let colors = global.labColors.colors(reaction);
		flag.setColor(colors.color, colors.secondaryColor);
		this.labReaction = reaction;
		this.labReagents = this.getLabReagents();
		return true;
	}
	return false;
};
Room.prototype.stopLabReaction = function(): boolean {
	if (!!Game.flags[this.name + "_LR"]) {
		const flag = Game.flags[this.name + "_LR"];
		flag.setColor(COLOR_WHITE, COLOR_RED);
		this.labReaction = undefined;
		this.labReagents = this.getLabReagents();
		return true;
	}
	return false;
};
Room.prototype.getLabReagents = function(): string[] {
	if (!!this.labReaction) {
		return global.findReagents(this.labReaction);
	}
	return undefined;
};
Room.prototype.observe = function(): void {
	/**
	 * Register if this room is in hostile or allied hands so we can plan routes accordingly.
	 */
	if (!Memory.matrixCache[this.name]) {
		Memory.matrixCache[this.name] = {
			t: 0,
			s: Game.time,
			m: [],
			cs: 0,
			st: 0,
		};
	}
	if (!!this.controller && !!this.controller.owner && !this.controller.my) {
		if (_.includes(global.alliedPlayers, this.controller.owner.username)) {
			Memory.matrixCache[this.name].a = true;
			delete Memory.matrixCache[this.name].h;
		} else {
			Memory.matrixCache[this.name].h = true;
			delete Memory.matrixCache[this.name].a;
		}
	} else {
		delete Memory.matrixCache[this.name].a;
		delete Memory.matrixCache[this.name].h;
	}
	/**
	 * Register PowerBanks in this room
	 */
	if (this.groupedStructures[STRUCTURE_POWER_BANK].length > 0) {
		let pb: StructurePowerBank = this.groupedStructures[STRUCTURE_POWER_BANK][0];
		if (pb.power >= (1250 * 1.5)) {
			if (!Memory.powerBanks[pb.id]) {
				Memory.powerBanks[pb.id] = {
					power: pb.power,
					decay: pb.ticksToDecay,
					pos: pb.pos,
					indexed: Game.time,
					taken: false,
				};
				console.log(`PowerBank found in room ${this.name}. ${pb.power} power, ${pb.ticksToDecay} to decay,`
					+ ` ${global.formatNumber(pb.hits)} hits to go.`);
			} else {
				Memory.powerBanks[pb.id].power = pb.power;
				Memory.powerBanks[pb.id].decay = pb.ticksToDecay;
				Memory.powerBanks[pb.id].indexed = Game.time;
			}
		}
	}
};
Room.prototype.addProperties = function () {
	this.towerTargets = [];

	this.allStructures =        this.getAllStructures();
	this.groupedStructures =    this.groupAllStructures();
	this.allCreeps =            this.getAllCreeps();
	this.allConstructionSites = this.getAllConstructionSites();
	this.minerals =             this.getMinerals();
	this.sources =              this.getSources();

	this.myStructures =         (!!this.my && this.allStructures.length > 0) ? this.getMyStructures() : [];
	this.myGroupedStructures  = (!!this.my && this.myStructures.length > 0) ? this.groupMyStructures() : undefined;
	this.mySpawns =             (!!this.my && this.myStructures.length > 0) ? this.getMySpawns() : [];
	this.myLabs =               (!!this.my && this.controller.level >= 6 && this.allStructures.length > 0) ? this.getMyLabs() : [];

	this.nuker =                (!!this.controller && this.controller.level === 8 && this.myStructures.length > 0) ? this.getNuker() : undefined;
	this.powerSpawn =           (!!this.controller && this.controller.level === 8 && this.myStructures.length > 0) ? this.getPowerSpawn() : undefined;
	this.observer =             (!!this.controller && this.controller.level === 8 && this.myStructures.length > 0) ? this.getObserver() : undefined;
	this.hostileStructures =    (!!this.controller && this.allStructures.length > 0) ? this.getHostileStructures() : [];

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

	// Cache a costMatrix in case we scanned this room using an observer last tick.
	this.getCostMatrix(false, true);
	this.observe();
};

Object.defineProperty(Room.prototype, "flags", {
	get: function() {
		return (!!this.__flags) ? this.__flags : this.__flags = this.find(FIND_FLAGS);
	},
	configurable: true,
	enumerable: false,
});
Object.defineProperty(Room.prototype, "weakestWall", {
	get: function() {
		return (!!this.__weakestWall) ? this.__weakestWall : this.__weakestWall =
			_.min(_.filter(this.groupedStructures[STRUCTURE_WALL], (w: StructureWall) => !w.pos.lookFor(LOOK_FLAGS).length), (w: StructureWall) => w.hits);
	},
	configurable: true,
	enumerable: false,
});
Object.defineProperty(Room.prototype, "weakestRampart", {
	get: function() {
		return (!!this.__wRampart) ? this.__wRampart : this.__wRampart =
			_.min(_.filter(this.groupedStructures[STRUCTURE_RAMPART], (w: StructureRampart) => !w.pos.lookFor(LOOK_FLAGS).length), (w: StructureRampart) => w.hits);
	},
	configurable: true,
	enumerable: false,
});
Object.defineProperty(Room.prototype, "openRamparts", {
	value: function() {
		_(this.groupedStructures[STRUCTURE_RAMPART]).filter((r: StructureRampart) => !!r.my && !r.isPublic).forEach((r: Rampart) => {
			r.setPublic(true);
		});
	},
	configurable: true,
	enumerable: false,
});
Object.defineProperty(Room.prototype, "closeRamparts", {
	value: function() {
		_(this.groupedStructures[STRUCTURE_RAMPART]).filter((r: StructureRampart) => !!r.my && !!r.isPublic).forEach((r: Rampart) => {
			r.setPublic(false);
		});
	},
	configurable: true,
	enumerable: false,
});
Object.defineProperty(Room.prototype, "my", {
	get: function() {
		return _.get(this, "controller.my", false);
	},
	enumerable: false,
	configurable: true,
});
