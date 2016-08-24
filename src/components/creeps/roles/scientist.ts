import CreepAction, {ICreepAction} from "../creepAction";
import * as Config from "../../../config/config";
export interface IScientist {
	action(): boolean;
}

const MODE = {
	IDLE: 0,
	ENERGIZE: 1,
	MINERALIZE: 2,
	PROFITIZE: 3,
};

export default class Scientist extends CreepAction implements IScientist, ICreepAction {

	public terminal: StructureTerminal;
	public storage: StructureStorage;
	public inLab1: StructureLab;
	public inLab2: StructureLab;
	public mode: number = 0;
	public reaction: string;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.terminal = this.creep.room.terminal;
		this.storage = this.creep.room.storage;
		if (!!this.creep.memory.mode) {
			this.mode = this.creep.memory.mode;
		}
		if (!!Game.flags[this.creep.room.name + "_LR"]) {
			let flag = Game.flags[this.creep.room.name + "_LR"];
			this.reaction = Config.labColors.resource(flag.color, flag.secondaryColor);
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
		return this.creep.room.myLabs.find((l: StructureLab) => (l.energyCapacity - l.energy) >= this.creep.carryCapacity);
	}

	public cleanUp(): boolean {
		throw new Error("Scientist.cleanUp not yet implemented");
	}
	public mineralize(): boolean {
		if (!!this.reaction && this.mode === MODE.IDLE && !this.creep.memory.targetId) {
			let reagents = Config.findReagents(this.reaction);
			if (!!reagents) {
				if (!!this.inLab1.mineralType && this.inLab1.mineralType !== reagents[0]) {
					this.cleanUp();
					return true;
				} else {
					if (this.inLab1.mineralCapacity - this.inLab1.mineralAmount >= this.creep.carryCapacity) {
						this.creep.memory.targetId = this.inLab1.id;
						this.creep.memory.mode = MODE.MINERALIZE;
						this.creep.memory.mineralType = reagents[0];
						this.creep.memory.moveToId = this.terminal.id;
						return true;
					}
				}
				if (!!this.inLab2.mineralType && this.inLab2.mineralType !== reagents[1]) {
					console.log(this.inLab2.mineralType, reagents[1]);
					this.cleanUp();
					return true;
				} else {
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
		} else if (this.mode === MODE.MINERALIZE && !!this.creep.memory.targetId && this.isBagFull()) {
			let t = this.getTarget(this.creep.memory.targetId);
			if (this.creep.pos.isNearTo(t.pos)) {
				if (this.creep.transfer(t, this.creep.memory.mineralType) === OK) {
					this.creep.say("Mineralize!", true);
					delete this.creep.memory.targetId;
					delete this.creep.memory.mineralType;
					this.creep.memory.mode = MODE.IDLE;
					return this.mineralize();
				}
			}
		}
		return false;
	}

	public profitize(): boolean {
		if (this.mode === MODE.IDLE && !this.creep.memory.targetId) {
			let lab = this.creep.room.myLabs.filter((l: StructureLab) => l.mineralType === this.reaction && l.mineralAmount > this.creep.carryCapacity).pop();
			if (!!lab) {
				this.creep.memory.targetId = lab.id;
				this.creep.memory.mode = MODE.PROFITIZE;
				this.creep.memory.moveToId = lab.id;
			}
		} else if (this.mode === MODE.PROFITIZE && !!this.creep.memory.targetId && this.isBagEmpty()) {
			let t = this.getTarget(this.creep.memory.targetId);
			if (this.creep.pos.isNearTo(t.pos)) {
				if (this.creep.withdraw(t, this.reaction) === OK) {
					this.creep.memory.moveToId = this.terminal.id;
				}
			}
		} else if (this.mode === MODE.PROFITIZE && !!this.creep.memory.targetId && this.isBagFull() && this.creep.pos.isNearTo(this.terminal)) {
			if (this.creep.transfer(this.terminal, this.reaction) === OK) {
				this.creep.say("Profit!", true);
				delete this.creep.memory.targetId;
				this.creep.memory.mode = MODE.IDLE;
				return this.profitize();
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
				this.creep.memory.moveToId = this.terminal.id;
				return true;
			}
		} else if (this.mode === MODE.ENERGIZE && !!this.creep.memory.targetId && this.isBagEmpty() && this.creep.pos.isNearTo(this.terminal)) {
			if (this.creep.withdraw(this.terminal, RESOURCE_ENERGY) === OK) {
				this.creep.memory.moveToId = this.creep.memory.targetId;
				return true;
			}
		} else if (this.mode === MODE.ENERGIZE && !!this.creep.memory.targetId && this.isBagFull()) {
			let t = this.getTarget(this.creep.memory.targetId);
			if (this.creep.pos.isNearTo(t.pos)) {
				if (this.creep.transfer(t, RESOURCE_ENERGY) === OK) {
					this.creep.say("Energize!", true);
					delete this.creep.memory.targetId;
					this.creep.memory.mode = MODE.IDLE;
					return this.energize();
				}
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
			} else {
				delete this.creep.memory.moveToId;

			}
		}
		return false;
	}

	public action(): boolean {
		if (this.renewCreep() && this.flee()) {
			this.energize();
			this.mineralize();
			this.profitize();
			this.move();
		}
		return true;
	}
}
