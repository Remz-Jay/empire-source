import CreepAction, {ICreepAction} from "../creepAction";

export interface IBuilder {

	targetConstructionSite: ConstructionSite;
	targetEnergySource: Spawn | Structure;

	isBagEmpty(): boolean;
	tryBuilding(): number;
	tryCollectEnergy(): number;
	moveToCollectEnergy(): void;
	moveToConstructionSite(): void;
	assignNewTarget(): boolean;

	action(): boolean;
}

export default class Builder extends CreepAction implements IBuilder, ICreepAction {

	public targetConstructionSite: ConstructionSite;
	public targetEnergySource: Spawn | Structure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);

		this.targetConstructionSite = Game.getObjectById<ConstructionSite>(this.creep.memory.target_construction_site_id);
		this.targetEnergySource = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_source_id);
	}

	public assignNewTarget(): boolean {
		let target: ConstructionSite = <ConstructionSite> this.creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
		if (target != null) {
			this.targetConstructionSite = target;
			this.creep.memory.target_construction_site_id = target.id;
			return true;
		} else {
			return false;
		}
	}

	public isBagEmpty(): boolean {
		return (this.creep.carry.energy === 0);
	}

	public tryBuilding(): number {
		return this.creep.build(this.targetConstructionSite);
	}

	public moveToCollectEnergy(): void {
		if (this.tryCollectEnergy() === ERR_NOT_IN_RANGE) {
			this.moveTo(this.targetEnergySource.pos);
		}
	}

	public tryCollectEnergy(): number {
		return this.creep.withdraw(this.targetEnergySource, RESOURCE_ENERGY);
	}

	public moveToConstructionSite(): void {
		let status: number = this.tryBuilding();
		switch (status) {
			case ERR_NOT_IN_RANGE:
				this.moveTo(this.targetConstructionSite.pos);
				break;
			case ERR_INVALID_TARGET:
				this.assignNewTarget();
				break;
			case OK:
				break;
			default:
				console.log(`Builder error ${status}`);
		}
	}

	public builderLogic() {
		if (this.creep.memory.building && this.creep.carry.energy === 0) {
			delete this.creep.memory.building;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.target;
			this.creep.say("B:COL");
		}
		if (!this.creep.memory.building && !this.creep.memory.idle &&
			this.creep.carry.energy === this.creep.carryCapacity
		) {
			this.creep.memory.building = true;
			delete this.creep.memory.target;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say("B:BUILD");
		}

		if (this.creep.memory.building) {
			if (!this.creep.memory.target) {
				let target: ConstructionSite = this.creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES) as ConstructionSite;
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					// nothing to build. return energy.
					delete this.creep.memory.building;
					this.creep.memory.idle = true;
					delete this.creep.memory.target;
					delete this.creep.memory.source;
					this.creep.say("B:IDLE");
					// this.moveTo(this.creep.pos.findClosestByPath(FIND_MY_SPAWNS));
				}
			}
			let target = Game.getObjectById(this.creep.memory.target) as ConstructionSite;
			if (!!target) {
				if (this.creep.build(target) === ERR_NOT_IN_RANGE) {
					this.moveTo(target.pos);
				}
			} else {
				delete this.creep.memory.target;
			}
		} else if (this.creep.memory.idle) {
			// scan for sites and return to active duty when found
			let target = this.creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES) as ConstructionSite;
			if (!!target) {
				this.creep.memory.target = target.id;
				delete this.creep.memory.target;
				this.creep.memory.building = true;
			} else {
				// nothing to build. return energy.
				delete this.creep.memory.building;
				this.creep.memory.idle = true;
				delete this.creep.memory.target;
				delete this.creep.memory.source;
				let spawn = this.creep.pos.findClosestByRange(FIND_MY_SPAWNS) as Spawn;
				if (this.creep.pos.isNearTo(spawn)) {
					if (this.creep.carry.energy > 0) {
						this.creep.transfer(spawn, RESOURCE_ENERGY);
					} else {
						spawn.recycleCreep(this.creep);
					}
				} else {
					this.creep.moveTo(spawn);
				}
				this.creep.say("B:IDLE!");
			}
		} else {
			if (!this.creep.memory.source) {
				// Prefer energy from containers
				let source: Source | StorageStructure = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure: StorageStructure) => ((structure.structureType === STRUCTURE_CONTAINER
					|| structure.structureType === STRUCTURE_STORAGE) && structure.store[RESOURCE_ENERGY] > 100)
					|| (structure.structureType === STRUCTURE_SPAWN),
				}) as StorageStructure;
				// Go to source otherwise
				if (!source) {
					source = this.creep.pos.findClosestByPath(FIND_SOURCES, {
						filter: (source: Source) => (source.energy > 100) || source.ticksToRegeneration < 30,
					}) as Source;
				}
				if (!!source) {
					this.creep.memory.source = source.id;
				}
			}
			if (!!this.creep.memory.source) {
				let source: RoomObject = Game.getObjectById(this.creep.memory.source) as RoomObject;
				if (source instanceof Structure) { // Sources aren't structures
					let status = this.creep.withdraw(source, RESOURCE_ENERGY);
					switch (status) {
						case ERR_NOT_ENOUGH_RESOURCES:
						case ERR_INVALID_TARGET:
						case ERR_NOT_OWNER:
						case ERR_FULL:
							delete this.creep.memory.source;
							break;
						case ERR_NOT_IN_RANGE:
							this.moveTo(source.pos);
							break;
						case OK:
							break;
						default:
							console.log(`Unhandled ERR in builder.source.container: ${status}`);
					}
				} else {
					let status = this.creep.harvest(source as Source);
					switch (status) {
						case ERR_NOT_ENOUGH_RESOURCES:
						case ERR_INVALID_TARGET:
						case ERR_NOT_OWNER:
						case ERR_FULL:
							delete this.creep.memory.source;
							break;
						case ERR_NOT_IN_RANGE:
							this.moveTo(source.pos);
							break;
						case OK:
							break;
						default:
							console.log(`Unhandled ERR in builder.source.harvest: ${status}`);
					}
				}
			}
		}
	};

	public action(): boolean {
		if (super.action()) {
			this.builderLogic();
		}
		// if (this.isBagEmpty()) {
		// 	this.moveToCollectEnergy();
		// } else {
		// 	this.moveToConstructionSite();
		// }

		return true;
	}

}
