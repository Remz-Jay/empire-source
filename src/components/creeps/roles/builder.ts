import CreepAction from "../creepAction";

export default class Builder extends CreepAction {

	public static PRIORITY: number = global.PRIORITY_BUILDER;
	public static ROLE: string = "Builder";
	public static MINRCL: number = global.MINRCL_BUILDER;

	public static bodyPart: string[] = [WORK, CARRY, MOVE];
	public static maxParts: number = 5;
	public static maxCreeps: number = 1;

	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const spawn = room.getFreeSpawn();
		const properties: CreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
			target_construction_site_id: room.myConstructionSites[0].id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public static getCreepLimit(room: Room): number {
		const sites = room.myConstructionSites;
		return (sites.length > 0) ? 1 : 0;
	}

	public targetConstructionSite: ConstructionSite;
	public targetEnergySource: Spawn | Structure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);

		this.targetConstructionSite = Game.getObjectById<ConstructionSite>(this.creep.memory.target_construction_site_id);
		this.targetEnergySource = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_source_id);
		if (!this.targetConstructionSite) {
			this.assignNewTarget();
		}
	}

	public assignNewTarget(): boolean {
		const target: ConstructionSite = <ConstructionSite> this.creep.pos.findClosestByRange(this.creep.room.myConstructionSites);
		if (!!target) {
			this.targetConstructionSite = target;
			this.creep.memory.target_construction_site_id = target.id;
			return true;
		} else {
			return false;
		}
	}

	public tryBuilding(): number {
		return this.creep.build(this.targetConstructionSite);
	}

	public moveToCollectEnergy(): void {
		if (!this.creep.pos.isNearTo(this.targetEnergySource)) {
			this.moveTo(this.targetEnergySource.pos);
		} else {
			this.tryCollectEnergy();
		}
	}

	public tryCollectEnergy(): number {
		return this.creep.withdraw(this.targetEnergySource, RESOURCE_ENERGY);
	}

	public moveToConstructionSite(): void {
		if (!this.creep.pos.inRangeTo(this.targetConstructionSite.pos, 3)) {
			this.moveTo(this.targetConstructionSite.pos);
		} else {
			const status: number = this.tryBuilding();
			switch (status) {
				case ERR_INVALID_TARGET:
					this.assignNewTarget();
					break;
				case OK:
					break;
				default:
					console.log(`Builder error ${status}`);
			}
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
				const target: ConstructionSite = this.creep.pos.findClosestByRange(this.creep.room.myConstructionSites) as ConstructionSite;
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					// nothing to build. return energy.
					delete this.creep.memory.building;
					this.creep.memory.idle = true;
					delete this.creep.memory.target;
					delete this.creep.memory.source;
					this.creep.say("B:IDLE");
				}
			}
			const target = Game.getObjectById(this.creep.memory.target) as ConstructionSite;
			if (!!target) {
				if (!this.creep.pos.inRangeTo(target.pos, 3)) {
					this.moveTo(this.createPathFinderMap(target.pos, 3));
				} else {
					this.creep.build(target);
				}
			} else {
				delete this.creep.memory.target;
			}
		} else if (this.creep.memory.idle) {
			// scan for sites and return to active duty when found
			const target = this.creep.pos.findClosestByRange(this.creep.room.myConstructionSites) as ConstructionSite;
			if (!!target) {
				this.creep.memory.target = target.id;
				delete this.creep.memory.idle;
				this.creep.memory.building = true;
			} else {
				// nothing to build. return energy.
				delete this.creep.memory.building;
				this.creep.memory.idle = true;
				delete this.creep.memory.target;
				delete this.creep.memory.source;
				const spawn = this.creep.pos.findClosestByRange(this.creep.room.mySpawns) as Spawn;
				if (this.creep.pos.isNearTo(spawn)) {
					spawn.recycleCreep(this.creep);
					// this.creep.memory.role = "Upgrader";
				} else {
					this.moveTo(spawn.pos);
				}
				this.creep.say("B:IDLE!");
			}
		} else {
			if (!this.creep.memory.source) {
				// Prefer energy from containers
				const storageStructures = _.union(
					this.creep.room.groupedStructures[STRUCTURE_CONTAINER],
					this.creep.room.groupedStructures[STRUCTURE_STORAGE],
					this.creep.room.groupedStructures[STRUCTURE_SPAWN],
				);
				let source: Source | StorageStructure = this.creep.pos.findClosestByRange(storageStructures, {
					filter: (structure: StorageStructure) => ((structure instanceof StructureContainer
					|| structure instanceof StructureStorage) && structure.store[RESOURCE_ENERGY] > 100)
					|| (structure instanceof StructureSpawn && structure.energy  >= (structure.energyCapacity * 0.8)),
				}) as StorageStructure;
				// Go to source otherwise
				if (!source) {
					source = this.creep.pos.findClosestByRange(this.creep.room.sources, {
						filter: (source: Source) => (source.energy > 100) || source.ticksToRegeneration < 30,
					}) as Source;
				}
				if (!!source) {
					this.creep.memory.source = source.id;
				}
			}
			if (!!this.creep.memory.source) {
				const source: RoomObject = Game.getObjectById(this.creep.memory.source) as RoomObject;
				if (source instanceof Structure) { // Sources aren't structures
					if (!this.creep.pos.isNearTo(source)) {
						this.moveTo(source.pos);
					} else {
						const drops = source.pos.lookFor(LOOK_RESOURCES);
						if (drops.length > 0) {
							_.forEach(drops, (drop: Resource) => {
								this.creep.pickup(drop);
							});
						} else {
							const status = this.creep.withdraw(source, RESOURCE_ENERGY);
							switch (status) {
								case ERR_NOT_ENOUGH_RESOURCES:
								case ERR_INVALID_TARGET:
								case ERR_NOT_OWNER:
								case ERR_FULL:
									delete this.creep.memory.source;
									break;
								case OK:
									break;
								default:
									console.log(`Unhandled ERR in builder.source.container: ${status}`);
							}
						}
					}
				} else {
					if (!this.creep.pos.isNearTo(source)) {
						this.moveTo(source.pos);
					} else {
						const status = this.creep.harvest(source as Source);
						switch (status) {
							case ERR_NOT_ENOUGH_RESOURCES:
							case ERR_INVALID_TARGET:
							case ERR_NOT_OWNER:
							case ERR_FULL:
								delete this.creep.memory.source;
								break;
							case OK:
								break;
							default:
								console.log(`Unhandled ERR in builder.source.harvest: ${status}`);
						}
					}
				}
			} else {
				if (this.creep.carry.energy > 0) {
					// no sources, just return to building.
					this.creep.memory.building = true;
					delete this.creep.memory.target;
					delete this.creep.memory.target;
					delete this.creep.memory.source;
					this.creep.say("B:BUILD");
				}
			}
		}
	};

	public action(): boolean {
		if (super.action() && this.flee()) {
			this.builderLogic();
		}
		return true;
	}

}
