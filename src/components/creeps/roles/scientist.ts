import CreepAction, {ICreepAction} from "../creepAction";

export interface IScientist {
	action(): boolean;
}

const MODE = {
	IDLE: 0,
	ENERGIZE: 1,
	MINERALIZE: 2,
	PROFITIZE: 3,
	CLEANUP: 4,
	CLEANALL: 5,
	FILLBOOST: 6,
};

export default class Scientist extends CreepAction implements IScientist, ICreepAction {

	public terminal: StructureTerminal;
	public storage: StructureStorage;
	public inLab1: StructureLab;
	public inLab2: StructureLab;
	public boostLab: StructureLab;
	public mode: number = 0;
	public clean: boolean = false;
	public reaction: string;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.terminal = this.creep.room.terminal;
		this.storage = this.creep.room.storage;
		if (!!this.creep.memory.mode) {
			this.mode = this.creep.memory.mode;
		}
		if (!!this.creep.room.labReaction) {
			this.reaction = this.creep.room.labReaction;
			if (this.mode === MODE.CLEANALL) {
				this.mode = MODE.IDLE;
			}
		} else {
			this.reaction = undefined;
			this.clean = true;
		}
		if (!this.creep.memory.inLab1) {
			if (!!Game.flags[this.creep.room.name + "_L1"]) {
				this.inLab1 = Game.flags[this.creep.room.name + "_L1"].pos.lookFor(LOOK_STRUCTURES).pop() as StructureLab;
				this.creep.memory.inLab1 = this.inLab1.id;
			}
		} else {
			this.inLab1 = Game.getObjectById<StructureLab>(this.creep.memory.inLab1);
		}
		if (!this.creep.memory.inLab2) {
			if (!!Game.flags[this.creep.room.name + "_L2"]) {
				this.inLab2 = Game.flags[this.creep.room.name + "_L2"].pos.lookFor(LOOK_STRUCTURES).pop() as StructureLab;
				this.creep.memory.inLab2 = this.inLab2.id;
			}
		} else {
			this.inLab2 = Game.getObjectById<StructureLab>(this.creep.memory.inLab2);
		}
	}
	public isBagEmpty(): boolean {
		return (_.sum(this.creep.carry) === 0);
	}
	public isBagFull(): boolean {
		return (_.sum(this.creep.carry) === this.creep.carryCapacity);
	}

	public getTarget(targetId: string): Structure {
		return Game.getObjectById<Structure>(targetId);
	}

	public findEnergizeTarget(): StructureLab {
		return _.union(this.creep.room.myLabs, this.creep.room.boostLabs).find((l: StructureLab) => (l.energyCapacity - l.energy) >= this.creep.carryCapacity);
	}

	public cleanUp(lab: StructureLab): boolean {
		if (this.mode === MODE.IDLE && this.isBagEmpty()) {
			this.creep.memory.targetId = lab.id;
			this.creep.memory.mode = MODE.CLEANUP;
			this.creep.memory.mineralType = lab.mineralType;
			this.creep.memory.moveToId = lab.id;
			return true;
		} else if (this.mode === MODE.CLEANUP && !!this.creep.memory.targetId && this.isBagEmpty() && this.creep.pos.isNearTo(lab.pos)) {
			let amount = global.clamp(lab.mineralAmount, 0, this.creep.carryCapacity);
			let status = this.creep.withdraw(lab, lab.mineralType, amount);
			if (status === OK) {
				this.creep.memory.moveToId = this.terminal.id;
				return true;
			} else {
				this.creep.say(global.translateErrorCode(status));
			}
		} else if (this.mode === MODE.CLEANUP && !!this.creep.memory.targetId && !this.isBagEmpty() && this.creep.pos.isNearTo(this.terminal)) {
			if (this.creep.transfer(this.terminal, this.getMineralTypeFromStore(this.creep)) === OK) {
				this.creep.say("Clean!", true);
				delete this.creep.memory.targetId;
				delete this.creep.memory.moveToId;
				this.creep.memory.mode = MODE.IDLE;
				return true;
			}
		}
		return false;
	}
	public mineralize(): boolean {
		if (!this.clean && !!this.reaction && ((this.mode === MODE.IDLE && !this.creep.memory.targetId) || this.mode === MODE.CLEANUP)) {
			let reagents = this.creep.room.labReagents;
			if (!!reagents) {
				if (!!this.inLab1.mineralType && this.inLab1.mineralType !== reagents[0]) {
					return this.cleanUp(this.inLab1);
				} else if (!!this.terminal.store[reagents[0]] && this.terminal.store[reagents[0]] > 0) {
					if (this.inLab1.mineralCapacity - this.inLab1.mineralAmount >= this.creep.carryCapacity) {
						this.creep.memory.targetId = this.inLab1.id;
						this.creep.memory.mode = MODE.MINERALIZE;
						this.creep.memory.mineralType = reagents[0];
						this.creep.memory.moveToId = this.terminal.id;
						return true;
					}
				}

				if (!!this.inLab2.mineralType && this.inLab2.mineralType !== reagents[1]) {
					return this.cleanUp(this.inLab2);
				} else if (!!this.terminal.store[reagents[1]] && this.terminal.store[reagents[1]] > 0) {
					if (this.inLab2.mineralCapacity - this.inLab2.mineralAmount >= this.creep.carryCapacity) {
						this.creep.memory.targetId = this.inLab2.id;
						this.creep.memory.mode = MODE.MINERALIZE;
						this.creep.memory.mineralType = reagents[1];
						this.creep.memory.moveToId = this.terminal.id;
						return true;
					}
				}

			}
		} else if (this.mode === MODE.MINERALIZE && !!this.creep.memory.targetId && this.isBagEmpty() && this.creep.pos.isNearTo(this.terminal)) {
			if (this.creep.withdraw(this.terminal, this.creep.memory.mineralType) === OK) {
				this.creep.memory.moveToId = this.creep.memory.targetId;
				return true;
			}
		} else if (this.mode === MODE.MINERALIZE && !!this.creep.memory.targetId && !this.isBagEmpty()) {
			let t = this.getTarget(this.creep.memory.targetId);
			if (this.creep.pos.isNearTo(t.pos)) {
				if (this.creep.transfer(t, this.creep.memory.mineralType) === OK) {
					this.creep.say("\u0CA0\u203F\u0CA0", true);
					delete this.creep.memory.targetId;
					delete this.creep.memory.moveToId;
					delete this.creep.memory.mineralType;
					this.creep.memory.mode = MODE.IDLE;
					return true;
				}
			}
		}
		return false;
	}

	public profitize(): boolean {
		if (!this.clean && (this.mode === MODE.IDLE && !this.creep.memory.targetId) || this.mode === MODE.CLEANUP) {
			let lab = this.creep.room.myLabs.filter(
				(l: StructureLab) => l.mineralType === this.reaction && l.mineralAmount > this.creep.carryCapacity
			).pop();
			if (!!lab) {
				this.creep.memory.targetId = lab.id;
				this.creep.memory.mode = MODE.PROFITIZE;
				this.creep.memory.moveToId = lab.id;
				return true;
			} else {
				lab = this.creep.room.myLabs.filter(
					(l: StructureLab) => l.id !== this.inLab1.id && l.id !== this.inLab2.id && !!l.mineralType && l.mineralType !== this.reaction
				).pop();
				if (!!lab) {
					return this.cleanUp(lab);
				}
			}
		} else if (this.mode === MODE.PROFITIZE && !!this.creep.memory.targetId && this.isBagEmpty()) {
			let t = this.getTarget(this.creep.memory.targetId);
			if (this.creep.pos.isNearTo(t.pos)) {
				if (this.creep.withdraw(t, this.reaction) === OK) {
					this.creep.memory.moveToId = this.terminal.id;
					return true;
				}
			}
		} else if (this.mode === MODE.PROFITIZE && !!this.creep.memory.targetId && !this.isBagEmpty() && this.creep.pos.isNearTo(this.terminal)) {
			if (this.creep.transfer(this.terminal, this.reaction) === OK) {
				this.creep.say("\u270FProfit!", true);
				delete this.creep.memory.targetId;
				delete this.creep.memory.moveToId;
				this.creep.memory.mode = MODE.IDLE;
				return true;
			}
		}
		return false;
	}

	public fillBoostLabs(): boolean {
		if ((this.mode === MODE.IDLE && !this.creep.memory.targetId) || this.mode === MODE.CLEANUP) {
			let found: boolean = false;
			this.creep.room.boostLabs.forEach((lab: StructureLab) => {
				let flag = lab.pos.lookFor<Flag>(LOOK_FLAGS).shift();
				let mineralType = global.labColors.resource(flag.color, flag.secondaryColor);
				if (lab.mineralAmount > 0 && lab.mineralType !== mineralType) {
					this.cleanUp(lab);
					return true;
				} else if (lab.mineralAmount <= (lab.mineralCapacity - this.creep.carryCapacity) && this.terminal.store[mineralType] >= this.creep.carryCapacity) {
					this.creep.say(mineralType);
					this.creep.memory.targetId = lab.id;
					this.creep.memory.mode = MODE.FILLBOOST;
					this.creep.memory.mineralType = mineralType;
					this.creep.memory.moveToId = this.terminal.id;
					found = true;
					return true;
				}
			});
			if (found) {
				return true;
			}
		} else if (this.mode === MODE.FILLBOOST && !!this.creep.memory.targetId && this.isBagEmpty() && this.creep.pos.isNearTo(this.terminal)) {
			if (this.creep.withdraw(this.terminal, this.creep.memory.mineralType) === OK) {
				this.creep.memory.moveToId = this.creep.memory.targetId;
				return true;
			}
		} else if (this.mode === MODE.FILLBOOST && !!this.creep.memory.targetId && !this.isBagEmpty()) {
			let t = this.getTarget(this.creep.memory.targetId);
			if (this.creep.pos.isNearTo(t.pos)) {
				if (this.creep.transfer(t, this.creep.memory.mineralType) === OK) {
					this.creep.say("BÖÖÖST!", true);
					delete this.creep.memory.targetId;
					delete this.creep.memory.moveToId;
					delete this.creep.memory.mineralType;
					this.creep.memory.mode = MODE.IDLE;
					return true;
				}
			}
		}
		return false;
	}

	public cleanAll(): boolean {
		if (!this.clean) {
			return false;
		} else if (this.mode === MODE.IDLE && !this.isBagEmpty()) {
			this.reset();
		} else {
			let labs = this.creep.room.myLabs.filter(
				(l: StructureLab) => l.mineralAmount > 0
			);
			if (labs.length > 0) {
				let lab = labs.shift();
				this.cleanUp(lab);
				return true;
			}
		}
		return false;
	}

	public energize(): boolean {
		if (this.mode === MODE.IDLE && !this.creep.memory.targetId) {
			let t = this.findEnergizeTarget();
			if (!!t) {
				this.creep.memory.targetId = t.id;
				this.creep.memory.mode = MODE.ENERGIZE;
				return true;
			}
		} else if (this.mode === MODE.ENERGIZE && !!this.creep.memory.targetId && this.isBagEmpty()) {
			if (this.creep.pos.isNearTo(this.terminal)) {
				if (this.creep.withdraw(this.terminal, RESOURCE_ENERGY) === OK) {
					this.creep.memory.moveToId = this.creep.memory.targetId;
					return true;
				}
			} else {
				this.creep.memory.moveToId = this.terminal.id;
				return true;
			}
		} else if (this.mode === MODE.ENERGIZE && !!this.creep.memory.targetId && !this.isBagEmpty()) {
			let t = this.getTarget(this.creep.memory.targetId);
			if (this.creep.pos.isNearTo(t.pos)) {
				if (this.creep.transfer(t, RESOURCE_ENERGY) === OK) {
					// this.creep.say(t.id.substr(t.id.length - 5));
					this.creep.say("\u2614Energize!", true);
					delete this.creep.memory.moveToId;
					delete this.creep.memory.targetId;
					this.creep.memory.mode = MODE.IDLE;
					return true;
				}
			} else {
				this.creep.memory.moveToId = t.id;
				return true;
			}
		}
		return false;
	}

	public move(): boolean {
		if (!!this.creep.memory.moveToId) {
			let pos = this.getTarget(this.creep.memory.moveToId).pos;
			if (!this.creep.pos.isNearTo(pos)) {
				this.moveTo(pos);
				return true;
			}
		}
		return false;
	}
	public reset(): boolean {
		this.creep.memory.moveToId = this.terminal.id;
		if (this.creep.pos.isNearTo(this.terminal)) {
			if (_.sum(this.creep.carry) > 0) {
				this.creep.transfer(this.terminal, this.getMineralTypeFromStore(this.creep));
			} else {
				delete this.creep.memory.moveToId;
				delete this.creep.memory.targetId;
				this.creep.memory.mode = MODE.IDLE;
				return true;
			}
		}
		return false;
	}

	public action(): boolean {
		if (this.renewCreep() && this.flee()) {
			let status = (!this.fillBoostLabs() && !this.cleanAll() && !this.profitize() && !this.mineralize() && !this.energize());
			if (!this.move() && status) {
				this.reset();
			}
		}
		return true;
	}
}
