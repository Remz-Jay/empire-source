import CreepAction, {ICreepAction} from "../creepAction";

export interface ILinker {
	action(): boolean;
}

export default class Linker extends CreepAction implements ILinker, ICreepAction {

	public terminal: StructureTerminal;
	public storage: StructureStorage;
	public nuker: StructureNuker;
	public tower: StructureTower;
	public spot: RoomPosition;
	public storageMin: number = global.STORAGE_MIN;
	public terminalMax: number = global.TERMINAL_MAX;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.terminal = this.creep.room.terminal;
		this.storage = this.creep.room.storage;
		this.nuker = this.creep.room.nuker;
		if (!this.creep.memory.spot) {
			this.creep.memory.spot = this.findSpot();
		}
		this.spot = new RoomPosition(this.creep.memory.spot.x, this.creep.memory.spot.y, this.creep.memory.spot.roomName);
	}

	public findSpot(): RoomPosition {
		let flag = Game.flags[this.creep.room.name + "_LS"];
		if (!!flag) {
			return flag.pos;
		} else {
			let storPos = this.storage.pos;
			let positions = this.creep.room.lookForAtArea(
				LOOK_STRUCTURES,
				storPos.y - 1,
				storPos.x - 1,
				storPos.y + 1,
				storPos.x + 1,
				true
			) as Array<any>;
			let linkPos: RoomPosition;
			let termPos: RoomPosition;
			let creepPos: RoomPosition;
			positions.forEach((pos: any) => {
				if (pos.structure.structureType === STRUCTURE_TERMINAL) {
					termPos = new RoomPosition(pos.x, pos.y, this.creep.room.name);
				}
				if (pos.structure.structureType === STRUCTURE_LINK) {
					linkPos = new RoomPosition(pos.x, pos.y, this.creep.room.name);
				}
			});
			if (!!termPos && !!linkPos) {
				if ((termPos.x === storPos.x - 1 || termPos.x === storPos.x + 1) && termPos.y === storPos.y) {
					// Use x
					creepPos = new RoomPosition(termPos.x, linkPos.y, this.creep.room.name);
				} else if ((termPos.y === storPos.y - 1 || termPos.y === storPos.y + 1) && termPos.x === storPos.x) {
					// Use y
					creepPos = new RoomPosition(linkPos.x, termPos.y, this.creep.room.name);
				}
			} else if (!!linkPos) {
				if (linkPos.x === storPos.x) {
					// Stand left of the storage
					creepPos = new RoomPosition(linkPos.x - 1, linkPos.y, this.creep.room.name);
				} else if (linkPos.y === storPos.y) {
					// Stand below storage
					creepPos = new RoomPosition(linkPos.x, linkPos.y + 1, this.creep.room.name);
				}
			}
			if (!!creepPos) {
				return creepPos;
			} else {
				throw new Error("Linker.findSpot :: Could not find a suitable position. Help?");
			}
		}
	}

	public isAtSpot(): boolean {
		return this.creep.pos.isEqualTo(this.spot);
	}

	public move(): boolean {
		if (!this.isAtSpot()) {
			this.moveTo([{pos: this.spot, range: 0}]);
			return false;
		}
		return true;
	}

	public link(): boolean {
		if (!!this.creep.memory.direction && this.creep.memory.direction > 0) {
			return false;
		}
		let link: StructureLink;
		if (this.creep.pos.isNearTo(this.storage)) {
			if (!this.creep.memory.link) {
				let linkResult: StructureLink[] = _.filter(this.creep.room.myStructures,
					(s: Structure) => s.structureType === STRUCTURE_LINK && s.pos.isNearTo(this.storage)) as StructureLink[];
				if (linkResult.length > 0) {
					link = linkResult[0];
					this.creep.memory.link = link.id;
				} else {
					throw new Error("Linker.link :: Could not locate Link near Storage.");
				}
			} else {
				link = Game.getObjectById<StructureLink>(this.creep.memory.link);
			}
			if (!!link && this.creep.pos.isNearTo(link)) {
				if (_.sum(this.creep.carry) > 0 && this.getMineralTypeFromStore(this.creep) !== RESOURCE_ENERGY) {
					this.cleanUp();
					return true;
				}
				if (link.energy < 413) {
					if (this.creep.carry.energy === 0) {
						this.creep.withdraw(this.storage, RESOURCE_ENERGY, (413 - link.energy));
					} else {
						this.creep.transfer(link, RESOURCE_ENERGY);
					}
					return true;
				} else if (link.energy > 413) {
					if (this.creep.carry.energy === 0) {
						this.creep.withdraw(link, RESOURCE_ENERGY, (link.energy - 413));
					} else {
						this.creep.transfer(this.storage, RESOURCE_ENERGY);
					}
					return true;
				} else if (this.creep.carry.energy > 0) {
					this.creep.transfer(this.storage, RESOURCE_ENERGY);
					return true;
				} else {
					return false;
				}
			} else {
				return false;
			}
		}
		return false;
	}

	public balanceTerminal(): boolean {
		if (!!this.creep.memory.direction && this.creep.memory.direction > 2) { // busy with fillNuker
			return false;
		}
		if (!this.terminal || !this.creep.pos.isNearTo(this.terminal) || !this.creep.pos.isNearTo(this.storage)) {
			return false;
		}

		if (!!this.creep.memory.direction && this.creep.memory.direction > 0 && _.sum(this.creep.carry) > 0) {
			if (this.creep.memory.direction === 1) {
				this.creep.transfer(this.terminal, this.getMineralTypeFromStore(this.creep));
			} else {
				this.creep.transfer(this.storage, this.getMineralTypeFromStore(this.creep));
			}
			this.creep.memory.direction = 0;
			this.creep.memory.carryType = RESOURCE_ENERGY;
			return true;
		}

		if (this.storage.store.energy > this.storageMin && this.terminal.store.energy < this.terminalMax) {
			let amount: number = this.terminalMax - this.terminal.store.energy;
			if (amount > (this.creep.carryCapacity - _.sum(this.creep.carry))) {
				amount = (this.creep.carryCapacity - _.sum(this.creep.carry));
			}
			this.creep.withdraw(this.storage, RESOURCE_ENERGY, amount);
			this.creep.memory.direction = 1;
			this.creep.memory.carryType = RESOURCE_ENERGY;
			return true;
		} else if (this.terminal.store.energy > this.terminalMax) {
			let amount: number = this.terminal.store.energy - this.terminalMax;
			if (amount > (this.creep.carryCapacity - _.sum(this.creep.carry))) {
				amount = (this.creep.carryCapacity - _.sum(this.creep.carry));
			}
			this.creep.withdraw(this.terminal, RESOURCE_ENERGY, amount);
			this.creep.memory.direction = 2;
			this.creep.memory.carryType = RESOURCE_ENERGY;
			return true;
		}
		let done: boolean = false;
		global.RESOURCE_TYPES.forEach((r: string) => {
			if (done) {
				return;
			}
			if (!!this.storage.store[r] && (!this.terminal.store[r] || this.terminal.store[r] < this.terminalMax)) {
				let amount: number = this.terminalMax - (this.terminal.store[r] || 0);
				if (amount > (this.creep.carryCapacity - _.sum(this.creep.carry))) {
					amount = (this.creep.carryCapacity - _.sum(this.creep.carry));
				}
				if (amount > this.storage.store[r]) {
					amount = this.storage.store[r];
				}
				this.creep.withdraw(this.storage, r, amount);
				this.creep.memory.direction = 1;
				this.creep.memory.carryType = r;
				done = true;
			} else if (!!this.terminal.store[r] && this.terminal.store[r] > this.terminalMax) {
				let amount: number = this.terminal.store[r] - this.terminalMax;
				if (amount > (this.creep.carryCapacity - _.sum(this.creep.carry))) {
					amount = (this.creep.carryCapacity - _.sum(this.creep.carry));
				}
				this.creep.withdraw(this.terminal, r, amount);
				this.creep.memory.direction = 2;
				this.creep.memory.carryType = r;
				done = true;
			}
		}, this);
		return !!(done);
	}
	public fillNuker(): boolean {
		if (!!this.creep.memory.direction && this.creep.memory.direction > 4) { // busy with fillTower
			return false;
		}
		if (!this.nuker || !this.creep.pos.isNearTo(this.nuker) || !this.creep.pos.isNearTo(this.terminal)) {
			return false;
		}
		if (!!this.creep.memory.direction && this.creep.memory.direction > 2 && _.sum(this.creep.carry) > 0) {
			if (this.creep.memory.direction === 3) {
				this.creep.transfer(this.nuker, this.getMineralTypeFromStore(this.creep));
			} else {
				this.creep.transfer(this.terminal, this.getMineralTypeFromStore(this.creep));
			}
			this.creep.memory.direction = 0;
			this.creep.memory.carryType = RESOURCE_ENERGY;
			return true;
		}
		if (this.nuker.ghodium < this.nuker.ghodiumCapacity && !!this.terminal.store[RESOURCE_GHODIUM] && this.terminal.store[RESOURCE_GHODIUM] > 0) {
			let amount: number = this.nuker.ghodiumCapacity - this.nuker.ghodium;
			if (amount > (this.creep.carryCapacity - _.sum(this.creep.carry))) {
				amount = (this.creep.carryCapacity - _.sum(this.creep.carry));
			}
			if (amount > this.terminal.store[RESOURCE_GHODIUM]) {
				amount = this.terminal.store[RESOURCE_GHODIUM];
			}
			this.creep.withdraw(this.terminal, RESOURCE_GHODIUM, amount);
			this.creep.memory.direction = 3;
			this.creep.memory.carryType = RESOURCE_GHODIUM;
			return true;
		}
	}
	public fillTower(): boolean {
		if (!this.creep.memory.tower) {
			let towers = this.creep.room.myStructures.filter(
				(s: OwnedStructure) => s.structureType === STRUCTURE_TOWER && s.pos.isNearTo(this.creep.pos)
			) as StructureTower[];
			if (towers.length > 0) {
				this.tower = towers.pop();
				this.creep.memory.tower = this.tower.id;
			}
		} else {
			this.tower = Game.getObjectById<StructureTower>(this.creep.memory.tower);
		}
		if (!!this.tower) {
			if (!!this.creep.memory.direction && this.creep.memory.direction > 4) {
				if (this.creep.carry.energy > 0) {
					if (this.creep.memory.direction === 5) {
						this.creep.transfer(this.tower, RESOURCE_ENERGY);
						this.creep.say("TowerPower", true);
					} else {
						this.creep.transfer(this.storage, RESOURCE_ENERGY);
					}
				}
				this.creep.memory.direction = 0;
				this.creep.memory.carryType = RESOURCE_ENERGY;
				return true;
			}
			if (this.tower.energy < this.tower.energyCapacity && this.storage.store.energy > 0) {
				let amount: number = this.tower.energyCapacity - this.tower.energy;
				if (amount > (this.creep.carryCapacity - _.sum(this.creep.carry))) {
					amount = (this.creep.carryCapacity - _.sum(this.creep.carry));
				}
				if (amount > this.storage.store.energy) {
					amount = this.storage.store.energy;
				}
				this.creep.withdraw(this.storage, RESOURCE_ENERGY, amount);
				this.creep.memory.direction = 5;
				this.creep.memory.carryType = RESOURCE_ENERGY;
				return true;
			}
			return false;
		} else {
			return false;
		}
	}
	public cleanUp(): boolean {
		if (_.sum(this.creep.carry) > 0) {
			this.creep.transfer(this.storage, this.getMineralTypeFromStore(this.creep));
			return true;
		}
		return false;
	}

	public action(): boolean {
		if (super.action() && this.flee()) {
			if (this.move()) {
				if (!this.link() && !this.balanceTerminal() && !this.fillNuker() && !this.fillTower()) {
					this.cleanUp();
				}
			}
			return true;
		}
	}
}
