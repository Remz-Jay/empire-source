import CreepAction, {ICreepAction} from "../creepAction";

export interface IMiner {

	targetMineralSource: Mineral;
	targetMineralDropOff: Spawn | Structure;
	targetExtractor: StructureExtractor;
	mineralType: string;

	tryMining(): number;
	moveToMine(): void;
	tryMineralDropOff(): number;
	moveToDropMinerals(): void;
	assignNewDropOff(): boolean;
	assignNewSource(): boolean;

	action(startCpu: number): boolean;
}

export default class Miner extends CreepAction implements IMiner, ICreepAction {
	public targetMineralSource: Mineral;
	public targetMineralDropOff: Structure;
	public targetExtractor: StructureExtractor;
	public mineralType: string;

	public setCreep(creep: Creep) {
		super.setCreep(creep);

		this.targetMineralSource = Game.getObjectById<Mineral>(this.creep.memory.target_source_id);
		this.targetMineralDropOff = Game.getObjectById<Structure>(this.creep.memory.target_energy_dropoff_id);
		this.targetExtractor = Game.getObjectById<StructureExtractor>(this.creep.memory.target_extractor_id);
		this.mineralType = this.creep.memory.target_mineral_type;
		if (!this.targetMineralSource || !this.mineralType) {
			this.assignNewSource();
		}
		if (!this.targetMineralDropOff) {
			this.assignNewDropOff();
		}
		if (!this.targetExtractor && !!this.targetMineralSource) {
			this.targetExtractor = this.targetMineralSource.pos.lookFor<StructureExtractor>(LOOK_STRUCTURES).shift();
			this.creep.memory.target_extractor_id = this.targetExtractor.id;
		}
	}

	public assignNewSource(): boolean {
		const target: Mineral = <Mineral> this.creep.pos.findClosestByPath(this.creep.room.minerals, {
			filter: (source: Mineral) => {
				return !!source.pos.lookFor(LOOK_STRUCTURES);
			},
			costCallback: this.roomCallback,
		});
		if (target) {
			this.targetMineralSource = target;
			this.targetExtractor = target.pos.lookFor<StructureExtractor>(LOOK_STRUCTURES).shift();
			this.mineralType = target.mineralType;
			this.creep.memory.target_mineral_type = target.mineralType;
			this.creep.memory.target_source_id = target.id;
			this.creep.memory.target_extractor_id = this.targetExtractor.id;
			return true;
		} else {
			return false;
		}
	}

	public assignNewDropOff(): boolean {
		if (_.sum(this.creep.room.storage.store) < this.creep.room.storage.storeCapacity) {
			this.targetMineralDropOff = this.creep.room.storage;
			this.creep.memory.target_energy_dropoff_id = this.creep.room.storage.id;
			return true;
		} else {
			return false;
		}
	}

	public tryMining(): number {
		if (this.targetMineralSource.mineralAmount > 0 && this.targetExtractor.cooldown === 0) {
			if (this.creep.carrySum > (this.creep.carryCapacity * 0.9)) {
				const targets: Structure[] = this.creep.room.containers.filter(
					(c: Container) => _.sum(c.store) < c.storeCapacity && c.pos.isNearTo(this.creep.pos)
				);
				if (targets.length > 0) {
					this.creep.logTransfer(targets[0], this.getMineralTypeFromStore(this.creep));
				}
			}
			return this.creep.harvest(this.targetMineralSource);
		} else {
			return ERR_NOT_ENOUGH_RESOURCES;
		}
	}

	public moveToMine(): void {
		if (!this.creep.pos.isNearTo(this.targetMineralSource.pos)) {
			this.moveTo(this.targetMineralSource.pos);
		} else {
			this.tryMining();
		}
	}

	public tryMineralDropOff(): number {
		if (this.creep.carry.energy > 0) {
			return this.creep.logTransfer(this.targetMineralDropOff, RESOURCE_ENERGY);
		}
		return this.creep.logTransfer(this.targetMineralDropOff, this.mineralType);
	}

	public moveToDropMinerals(): void {
		if (!this.creep.pos.isNearTo(this.targetMineralDropOff)) {
			this.moveTo(this.targetMineralDropOff.pos);
		} else {
			const status = this.tryMineralDropOff();
			switch (status) {
				case ERR_NOT_ENOUGH_RESOURCES:
				case OK:
					break;
				case ERR_FULL:
					this.assignNewDropOff();
					break;
				default:
					console.log(`Miner energyDropOff error ${status}`);
			}
		}
	}

	public action(startCpu: number): boolean {
		this.startCpu = startCpu;
		// Don't do super.action here, we don't want to pick up resources.
		if (!this.renewCreep() || !this.flee()) {
			return false;
		}
		if (this.creep.bagFull) {
			this.moveToDropMinerals();
		} else {
			this.moveToMine();
		}
		return true;
	}
}
