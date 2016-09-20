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
	public terminalEnergyMax: number = global.TERMINAL_ENERGY_MAX;
	public carryTotal: number;
	public canTransfer: number;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.carryTotal = _.sum(this.creep.carry);
		this.canTransfer = this.creep.carryCapacity - this.carryTotal;
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
			let positions = this.safeLook(LOOK_STRUCTURES, storPos, 1);
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
				console.log("Linker.findSpot :: Could not find a suitable position. Help?");
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
		if (!this.creep.memory.link) {
			let linkResult: StructureLink[] = _.filter(this.creep.room.myStructures,
				(s: Structure) => s.structureType === STRUCTURE_LINK && s.pos.isNearTo(this.storage)) as StructureLink[];
			if (linkResult.length > 0) {
				link = linkResult[0];
				this.creep.memory.link = link.id;
			} else {
				console.log("Linker.link :: Could not locate Link near Storage.");
			}
		} else {
			link = Game.getObjectById<StructureLink>(this.creep.memory.link);
		}
		if (!!link) {
			let linkLimit: number = 413;
			let flagSearch = link.pos.lookFor<Flag>(LOOK_FLAGS);
			if (flagSearch.length > 0) {
				let flag = flagSearch.pop();
				if (flag.color === COLOR_PURPLE && flag.secondaryColor === COLOR_PURPLE) {
					linkLimit = link.energyCapacity;
				}
			}
			if (this.carryTotal > 0 && this.getMineralTypeFromStore(this.creep) !== RESOURCE_ENERGY) {
				this.cleanUp();
				return true;
			}
			if (link.energy < linkLimit) {
				if (this.creep.carry.energy === 0) {
					let transferValue = global.clamp((linkLimit - link.energy), 0, this.canTransfer);
					if (this.storage.store.energy >= transferValue) {
						this.creep.withdraw(this.storage, RESOURCE_ENERGY, transferValue);
					} else {
						return false;
					}
				} else {
					this.creep.transfer(link, RESOURCE_ENERGY);
				}
				return true;
			} else if (link.energy > linkLimit) {
				if (this.creep.carry.energy === 0) {
					let transferValue = global.clamp((link.energy - linkLimit), 0, this.canTransfer);
					this.creep.withdraw(link, RESOURCE_ENERGY, transferValue);
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

	public balanceTerminal(): boolean {
		if (!!this.creep.memory.direction && this.creep.memory.direction > 2) { // busy with fillNuker
			return false;
		}
		if (!this.terminal) {
			return false;
		}

		if (!!this.creep.memory.direction && this.creep.memory.direction > 0 && this.carryTotal > 0) {
			if (this.creep.memory.direction === 1) {
				this.creep.transfer(this.terminal, this.getMineralTypeFromStore(this.creep));
			} else {
				this.creep.transfer(this.storage, this.getMineralTypeFromStore(this.creep));
			}
			this.creep.memory.direction = 0;
			this.creep.memory.carryType = RESOURCE_ENERGY;
			return true;
		}

		if (this.storage.store.energy > (this.storageMin / 10) && this.terminal.store.energy < this.terminalEnergyMax) {
			let amount: number = global.clamp(this.terminalEnergyMax - this.terminal.store.energy, 0, this.canTransfer);
			this.creep.withdraw(this.storage, RESOURCE_ENERGY, amount);
			this.creep.memory.direction = 1;
			this.creep.memory.carryType = RESOURCE_ENERGY;
			return true;
		} else if (this.terminal.store.energy > this.terminalEnergyMax) {
			let amount: number = global.clamp(this.terminal.store.energy - this.terminalEnergyMax, 0, this.canTransfer);
			this.creep.withdraw(this.terminal, RESOURCE_ENERGY, amount);
			this.creep.memory.direction = 2;
			this.creep.memory.carryType = RESOURCE_ENERGY;
			return true;
		}
		let done: boolean = false;
		_.difference(RESOURCES_ALL, [RESOURCE_ENERGY]).forEach((r: string) => {
			if (done) {
				return;
			}
			if (!!this.storage.store[r] && (!this.terminal.store[r] || this.terminal.store[r] < this.terminalMax)) {
				let amount: number = global.clamp(
					this.terminalMax - (this.terminal.store[r] || 0),
					0,
					_.min([this.canTransfer, this.storage.store[r]])
				);
				this.creep.withdraw(this.storage, r, amount);
				this.creep.memory.direction = 1;
				this.creep.memory.carryType = r;
				done = true;
			} else if (!!this.terminal.store[r] && this.terminal.store[r] > this.terminalMax) {
				let amount: number = global.clamp(this.terminal.store[r] - this.terminalMax, 0, this.canTransfer);
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
		if (!this.nuker) {
			return false;
		}
		if (!!this.creep.memory.direction && this.creep.memory.direction > 2 && this.carryTotal > 0) {
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
			let amount: number = global.clamp(
				this.nuker.ghodiumCapacity - this.nuker.ghodium,
				0,
				_.min([this.canTransfer, this.terminal.store[RESOURCE_GHODIUM]])
			);
			this.creep.withdraw(this.terminal, RESOURCE_GHODIUM, amount);
			this.creep.memory.direction = 3;
			this.creep.memory.carryType = RESOURCE_GHODIUM;
			return true;
		}
		if (this.nuker.energy < this.nuker.energyCapacity && this.storage.store.energy > global.STORAGE_MIN) {
			let amount: number = global.clamp(this.nuker.energyCapacity - this.nuker.energy, 0, this.canTransfer);
			this.creep.withdraw(this.storage, RESOURCE_ENERGY, amount);
			this.creep.memory.direction = 3;
			this.creep.memory.carryType = RESOURCE_ENERGY;
			return true;
		}
		return false;
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
				let amount: number = global.clamp(
					this.tower.energyCapacity - this.tower.energy,
					0,
					_.min([this.canTransfer, this.storage.store.energy])
				);
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
		if (this.carryTotal > 0) {
			this.creep.transfer(this.storage, this.getMineralTypeFromStore(this.creep));
			return true;
		}
		return false;
	}

	public action(): boolean {
		if (this.renewCreep() && this.move()) {
			if (!this.link() && !this.balanceTerminal() && !this.fillNuker() && !this.fillTower()) {
				this.cleanUp();
			}
			return true;
		}
	}
}
