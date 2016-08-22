import CreepAction, {ICreepAction} from "../creepAction";
import * as SourceManager from "../../sources/sourceManager";

export interface IHarvester {

	targetSource: Source;
	targetEnergyDropOff: Spawn | Structure;

	isBagFull(): boolean;
	tryHarvest(): number;
	moveToHarvest(): void;
	tryEnergyDropOff(): number;
	moveToDropEnergy(): void;
	assignNewDropOff(): boolean;
	assignNewSource(): boolean;

	action(): boolean;
}

export default class Harvester extends CreepAction implements IHarvester, ICreepAction {
	public targetSource: Source;
	public targetEnergyDropOff: Spawn | Structure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);

		this.targetSource = Game.getObjectById<Source>(this.creep.memory.target_source_id);
		this.targetEnergyDropOff = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_dropoff_id);
	}

	public assignNewSource(): boolean {
		let target: Source = <Source> this.creep.pos.findClosestByPath(this.creep.room.sources, {
			filter: (source: Source) => {
				return (
					_.includes(SourceManager.sources, source)
				);
			},
			costCallback: this.roomCallback,
		});
		if (target) {
			this.targetSource = target;
			this.creep.memory.target_source_id = target.id;
			return true;
		} else {
			return false;
		}
	}

	public assignNewDropOff(): boolean {
		let target: EnergyStructure = <EnergyStructure> this.creep.pos.findClosestByPath(this.creep.room.myStructures, {
			filter: (structure: EnergyStructure) => {
				return (
						structure.structureType === STRUCTURE_EXTENSION ||
						structure.structureType === STRUCTURE_SPAWN ||
						structure.structureType === STRUCTURE_TOWER
						// structure.structureType === STRUCTURE_CONTAINER ||
						// structure.structureType === STRUCTURE_STORAGE
					) && structure.energy < structure.energyCapacity;
			},
			costCallback: this.roomCallback,
		});
		if (target != null) {
			this.targetEnergyDropOff = target;
			this.creep.memory.target_energy_dropoff_id = target.id;
			return true;
		} else {
			return false;
		}
	}

	public isBagFull(): boolean {
		return (this.creep.carry.energy === this.creep.carryCapacity);
	}

	public tryHarvest(): number {
		return this.creep.harvest(this.targetSource);
	}

	public moveToHarvest(): void {
		if (this.tryHarvest() === ERR_NOT_IN_RANGE) {
			this.moveTo(this.targetSource.pos);
		}
	}

	public tryEnergyDropOff(): number {
		return this.creep.transfer(this.targetEnergyDropOff, RESOURCE_ENERGY);
	}

	public moveToDropEnergy(): void {
		let status = this.tryEnergyDropOff();
		switch (status) {
			case OK:
				break;
			case ERR_NOT_IN_RANGE:
				this.moveTo(this.targetEnergyDropOff.pos);
				break;
			case ERR_FULL:
				this.assignNewDropOff();
				break;
			default:
				console.log(`harvester energyDropOff error ${status}`);
		}
		if (this.tryEnergyDropOff() === ERR_NOT_IN_RANGE) {
			this.moveTo(this.targetEnergyDropOff.pos);
		}
	}

	public harvesterLogic () {
		if (this.creep.memory.dumping && this.creep.carry.energy === 0) {
			delete this.creep.memory.dumping;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say("H:HARV");
		}
		if (!this.creep.memory.dumping && this.creep.carry.energy === this.creep.carryCapacity) {
			this.creep.memory.dumping = true;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say("H:DIST");
		}
		if (this.creep.memory.dumping) {
			if (!this.creep.memory.target) {
				// Containers are nearby, fill them first.
				let target: Structure = this.creep.pos.findClosestByPath(this.creep.room.allStructures, {
					filter: (structure: StructureContainer) => {
						return structure.structureType === STRUCTURE_CONTAINER &&
							_.sum(structure.store) < structure.storeCapacity;
					},
					costCallback: this.roomCallback,
				}) as StructureContainer;
				// If all containers are full, move directly to an owned structure.
				if (!target) {
					target = this.creep.pos.findClosestByPath(this.creep.room.myStructures, {
						filter: (structure: EnergyStructure) => {
							return (
									structure.structureType === STRUCTURE_EXTENSION ||
									structure.structureType === STRUCTURE_SPAWN ||
									structure.structureType === STRUCTURE_TOWER
								) && structure.energy < structure.energyCapacity;
						},
						costCallback: this.roomCallback,
					}) as EnergyStructure;
				}
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					this.creep.memory.target = this.creep.room.controller.id;
				}
			}
			let target: Structure = Game.getObjectById(this.creep.memory.target) as Structure;
			if (!target) {
				delete this.creep.memory.target;
			} else {
				switch (target.structureType) {
					case STRUCTURE_EXTENSION:
					case STRUCTURE_SPAWN:
					case STRUCTURE_TOWER:
					case STRUCTURE_CONTAINER:
						let status = this.creep.transfer(target, RESOURCE_ENERGY);
						switch (status) {
							case ERR_NOT_IN_RANGE:
								this.moveTo(target.pos);
								break;
							case ERR_FULL:
								delete this.creep.memory.target;
								break;
							case OK:
								break;
							default:
								console.log(`Status ${status} not defined for RoleHarvester..dump.spawn`);
						}
						break;
					case STRUCTURE_CONTROLLER:
						if (this.creep.upgradeController(target as StructureController) === ERR_NOT_IN_RANGE) {
							this.moveTo(target.pos);
						}
						break;
					default:
						console.log(`Unhandled structureType ${target.structureType} in RoleHarvester`);
				}
			}
		} else {
			if (!this.creep.memory.source) {
				let source: Source;
				if (!!this.creep.memory.preferredSource) {
					source = Game.getObjectById(this.creep.memory.preferredSource) as Source;
				} else {
					source = this.creep.pos.findClosestByPath(this.creep.room.sources, {
						filter: (source: Source) => (source.energy >= 100) || source.ticksToRegeneration < 60,
						costCallback: this.roomCallback,
					}) as Source;
				}
				if (!!source) {
					this.creep.memory.source = source.id;
				}
			}
			if (!!this.creep.memory.source) {
				let source: Source = Game.getObjectById(this.creep.memory.source) as Source;
				let status = this.creep.harvest(source);
				switch (status) {
					case ERR_NOT_ENOUGH_RESOURCES:
					case ERR_INVALID_TARGET:
						if (source.ticksToRegeneration < 60 || source.id === this.creep.memory.preferredSource) {
							if (this.creep.pos.getRangeTo(source) > 1) {
								this.moveTo(source.pos);
							}
							break;
						}
					case ERR_NOT_OWNER:
					case ERR_FULL:
						// Dump first before harvesting again.
						if (this.creep.carry.energy !== 0) {
							this.creep.memory.dumping = true;
							delete this.creep.memory.target;
							delete this.creep.memory.source;
							this.creep.say("H:DIST");
						} else {
							delete this.creep.memory.source;
							this.creep.say("H:NEWSRC");
						}
						break;
					case ERR_NOT_IN_RANGE:
						this.moveTo(source.pos);
						break;
					case OK:
						break;
					default:
						console.log(`Unhandled ERR in RoleHarvester.source.harvest: ${status}`);
				}
				let targets: StructureContainer[] = this.creep.pos.findInRange(FIND_STRUCTURES, 1, {
					filter: function (s: StructureContainer) {
						return s.structureType === STRUCTURE_CONTAINER &&
							_.sum(s.store) < s.storeCapacity;
					},
				}) as StructureContainer[];
				if (targets.length > 0) {
					this.creep.transfer(targets[0], RESOURCE_ENERGY);
				}
			} else {
				delete this.creep.memory.source;
			}
		}
	};

	public action(): boolean {
		// Don't do super.action here, we don't want to pick up resources.
		if (!this.renewCreep() || !this.flee()) {
			return false;
		}
		this.harvesterLogic();
		// if (this.isBagFull()) {
		// 	this.moveToDropEnergy();
		// } else {
		// 	this.moveToHarvest();
		// }
		return true;
	}

}
