import CreepAction, {ICreepAction} from "../creepAction";
import * as SourceManager from "../../sources/sourceManager";

export interface IHarvester {

	targetSource: Source;
	targetEnergyDropOff: Spawn | Structure;

	tryHarvest(): number;
	tryEnergyDropOff(): number;
	moveToDropEnergy(): void;
	assignNewDropOff(): boolean;
	assignNewSource(): boolean;

	action(startCpu: number): boolean;
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
		const target: Source = <Source> this.creep.pos.findClosestByPath(this.creep.room.sources, {
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
		let energyStructures = _.union(
			this.creep.room.myGroupedStructures[STRUCTURE_EXTENSION],
			this.creep.room.myGroupedStructures[STRUCTURE_SPAWN],
			this.creep.room.myGroupedStructures[STRUCTURE_TOWER],
		);
		const target: EnergyStructure = <EnergyStructure> this.creep.pos.findClosestByPath(energyStructures, {
			filter: (structure: EnergyStructure) => structure.energy < structure.energyCapacity,
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

	public tryHarvest(): number {
		return this.creep.harvest(this.targetSource);
	}

	public tryEnergyDropOff(): number {
		return this.creep.logTransfer(this.targetEnergyDropOff, RESOURCE_ENERGY);
	}

	public moveToDropEnergy(): void {
		if (!this.creep.pos.isNearTo(this.targetEnergyDropOff.pos)) {
			this.moveTo(this.targetEnergyDropOff.pos);
		} else {
			const status = this.tryEnergyDropOff();
			switch (status) {
				case OK:
					break;
				case ERR_FULL:
					this.assignNewDropOff();
					break;
				default:
					console.log(`harvester energyDropOff error ${status}`);
			}
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
				let target: Structure = this.creep.pos.findClosestByPath(this.creep.room.groupedStructures[STRUCTURE_CONTAINER], {
					filter: (structure: StructureContainer) => _.sum(structure.store) < structure.storeCapacity,
					costCallback: this.roomCallback,
				}) as StructureContainer;
				// If all containers are full, move directly to an owned structure.
				if (!target) {
					const energyStructures = _.union(
						this.creep.room.myGroupedStructures[STRUCTURE_EXTENSION],
						this.creep.room.myGroupedStructures[STRUCTURE_SPAWN],
						this.creep.room.myGroupedStructures[STRUCTURE_TOWER],
					);
					target = this.creep.pos.findClosestByPath(energyStructures, {
						filter: (structure: EnergyStructure) => structure.energy < structure.energyCapacity,
						costCallback: this.roomCallback,
					}) as EnergyStructure;
				}
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					this.creep.memory.target = this.creep.room.controller.id;
				}
			}
			const target: Structure = Game.getObjectById(this.creep.memory.target) as Structure;
			if (!target) {
				delete this.creep.memory.target;
			} else {
				switch (target.structureType) {
					case STRUCTURE_EXTENSION:
					case STRUCTURE_SPAWN:
					case STRUCTURE_TOWER:
					case STRUCTURE_CONTAINER:
						if (!this.creep.pos.isNearTo(target)) {
							this.moveTo(target.pos);
						} else {
							const status = this.creep.logTransfer(target, RESOURCE_ENERGY);
							switch (status) {
								case ERR_FULL:
									delete this.creep.memory.target;
									break;
								case OK:
									break;
								default:
									console.log(`Status ${status} not defined for RoleHarvester..dump.spawn`);
							}
						}
						break;
					case STRUCTURE_CONTROLLER:
						if (!this.creep.pos.inRangeTo(target.pos, 3)) {
							this.moveTo(target.pos);
						} else {
							this.creep.upgradeController(target as StructureController);
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
				const source: Source = Game.getObjectById(this.creep.memory.source) as Source;
				let container: StructureContainer;
				let link: StructureLink;
				if (!!this.creep.memory[`link_${this.creep.memory.source}`]) {
					link = Game.getObjectById(this.creep.memory[`link_${this.creep.memory.source}`]) as StructureLink;
				}
				if (!!this.creep.memory[`cont_${this.creep.memory.source}`]) {
					container = Game.getObjectById(this.creep.memory[`cont_${this.creep.memory.source}`]) as StructureContainer;
					if (!container) {
						delete this.creep.memory[`cont_${this.creep.memory.source}`];
					}
				} else {
					const lr = this.safeLook(LOOK_STRUCTURES, source.pos, 2);
					if (lr.length > 0) {
						const s = _.map(lr, "structure");
						const containers = _.filter(s, (x: Structure) => x.structureType === STRUCTURE_CONTAINER);
						if (containers.length > 0) {
							container = source.pos.findClosestByRange(containers) as StructureContainer;
							this.creep.memory[`cont_${this.creep.memory.source}`] = container.id;
						}
						const links = _.filter(s, (x: Structure) => x.structureType === STRUCTURE_LINK);
						if (links.length > 0) {
							link = source.pos.findClosestByRange(links) as StructureLink;
							this.creep.memory[`link_${this.creep.memory.source}`] = link.id;
						}
					}
				}
				if (!!container && !this.creep.pos.isEqualTo(container.pos)) {
					const pfg: PathFinderGoal = this.createPathFinderMap(<RoomPosition> container.pos, 0);
					this.moveTo(pfg);
				} else if (!this.creep.pos.isNearTo(source)) {
					this.moveTo(source.pos);
				} else {
					if (!!container && this.creep.carry.energy > (this.creep.carryCapacity * 0.2) && container.hits < container.hitsMax) {
						return this.creep.repair(container);
					} else if (!!container && this.creep.carry.energy > (this.creep.carryCapacity * 0.8)) {
						if (!!link && link.energy < link.energyCapacity && this.creep.pos.isNearTo(link.pos)) {
							this.creep.logTransfer(link, RESOURCE_ENERGY);
						} else if (this.creep.pos.isNearTo(container.pos)) {
							if (_.sum(container.store) < container.storeCapacity) {
								this.creep.logTransfer(container, RESOURCE_ENERGY);
							} else {
								this.creep.drop(RESOURCE_ENERGY);
							}
						}
					}
					if (source.energy > 0) {
						const status = this.creep.harvest(source);
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
							case OK:
								break;
							default:
								console.log(`Unhandled ERR in RoleHarvester.source.harvest: ${status}`);
						}
					}
				}
			} else {
				delete this.creep.memory.source;
			}
		}
	};

	public action(startCpu: number): boolean {
		this.startCpu = startCpu;
		if (this.checkCpu()) {
			this.harvesterLogic();
			return true;
		} else {
			return false;
		}
	}

}
