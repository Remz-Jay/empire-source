import CreepAction, {ICreepAction} from "../creepAction";

export interface IMiner {

	targetMineralSource: Mineral;
	targetMineralDropOff: Spawn | Structure;
	mineralType: string;

	isBagFull(): boolean;
	tryMining(): number;
	moveToMine(): void;
	tryMineralDropOff(): number;
	moveToDropMinerals(): void;
	assignNewDropOff(): boolean;
	assignNewSource(): boolean;

	action(): boolean;
}

export default class Miner extends CreepAction implements IMiner, ICreepAction {
	public targetMineralSource: Mineral;
	public targetMineralDropOff: Spawn | Structure;
	public mineralType: string;

	public setCreep(creep: Creep) {
		super.setCreep(creep);

		this.targetMineralSource = Game.getObjectById<Mineral>(this.creep.memory.target_source_id);
		this.targetMineralDropOff = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_dropoff_id);
		this.mineralType = this.creep.memory.target_mineral_type;
		if (!this.targetMineralSource || !this.mineralType) {
			this.assignNewSource();
		}
		if (!this.targetMineralDropOff) {
			this.assignNewDropOff();
		}
	}

	public assignNewSource(): boolean {
		let target: Mineral = <Mineral> this.creep.pos.findClosestByPath(FIND_MINERALS, {
			filter: (source: Mineral) => {
				return !!source.pos.lookFor(LOOK_STRUCTURES);
			},
		});
		if (target) {
			this.targetMineralSource = target;
			this.mineralType = target.mineralType;
			this.creep.memory.target_mineral_type = target.mineralType;
			this.creep.memory.target_source_id = target.id;
			return true;
		} else {
			return false;
		}
	}

	public assignNewDropOff(): boolean {
		let target: EnergyStructure = <EnergyStructure> this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
			filter: (structure: StorageStructure) => {
				return (
						structure.structureType === STRUCTURE_CONTAINER ||
						structure.structureType === STRUCTURE_STORAGE
					) && _.sum(structure.store) < structure.storeCapacity;
			},
		});
		if (target != null) {
			this.targetMineralDropOff = target;
			this.creep.memory.target_energy_dropoff_id = target.id;
			return true;
		} else {
			return false;
		}
	}

	public isBagFull(): boolean {
		return (_.sum(this.creep.carry) === this.creep.carryCapacity);
	}

	public tryMining(): number {
		return this.creep.harvest(this.targetMineralSource);
	}

	public moveToMine(): void {
		if (this.tryMining() === ERR_NOT_IN_RANGE) {
			if (!this.creep.memory.targetPath) {
				if (!this.findNewPath(this.targetMineralSource)) {
					this.creep.say("HALP!");
				}
			} else {
				let path = this.deserializePathFinderPath(this.creep.memory.targetPath);
				this.moveByPath(path, this.targetMineralSource);
			}
		} else {
			delete this.creep.memory.targetPath;
			let targets: StructureContainer[] = this.creep.pos.findInRange(FIND_STRUCTURES, 1, {
				filter: function (s: StructureContainer) {
					return s.structureType === STRUCTURE_CONTAINER &&
						_.sum(s.store) < s.storeCapacity;
				},
			}) as StructureContainer[];
			if (targets.length > 0) {
				this.targetMineralDropOff = targets[0];
				this.creep.memory.target_energy_dropoff_id = targets[0].id;
				this.tryMineralDropOff();
			}
		}
	}

	public tryMineralDropOff(): number {
		if (this.creep.carry.energy > 0) {
			return this.creep.transfer(this.targetMineralDropOff, RESOURCE_ENERGY);
		}
		return this.creep.transfer(this.targetMineralDropOff, this.mineralType);
	}

	public moveToDropMinerals(): void {
		let status = this.tryMineralDropOff();
		switch (status) {
			case ERR_NOT_ENOUGH_RESOURCES:
			case OK:
				break;
			case ERR_NOT_IN_RANGE:
				this.moveTo(this.targetMineralDropOff.pos);
				break;
			case ERR_FULL:
				this.assignNewDropOff();
				break;
			default:
				console.log(`Miner energyDropOff error ${status}`);
		}
		if (this.tryMineralDropOff() === ERR_NOT_IN_RANGE) {
			this.moveTo(this.targetMineralDropOff.pos);
		}
	}

	public action(): boolean {
		// Don't do super.action here, we don't want to pick up resources.
		if (!this.renewCreep() || !this.flee()) {
			return false;
		}
		if (this.isBagFull()) {
			this.moveToDropMinerals();
		} else {
			this.moveToMine();
		}
		return true;
	}
}
