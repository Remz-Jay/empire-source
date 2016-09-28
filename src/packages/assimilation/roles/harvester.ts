import ASMCreepAction from "../assimilationCreepAction";
import ASMHarvesterGovernor from "../governors/harvester";

export interface IASMHarvester {
	action(): boolean;
}

export default class ASMHarvester extends ASMCreepAction implements IASMHarvester {

	public container: StructureContainer;
	public source: Source;
	public keeperLair: StructureKeeperLair;
	public governor: ASMHarvesterGovernor;

	public setGovernor(governor: ASMHarvesterGovernor): void {
		this.governor = governor;
	}

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		if (!this.creep.memory.container && !this.creep.memory.source) {
			this.creep.memory.container = this.governor.checkContainerAssignment();
		}
		this.container = Game.getObjectById<StructureContainer>(this.creep.memory.container);
		if (!this.creep.memory.source && !!this.container) {
			let source = this.findSourceNearContainer(this.container);
			this.source = source;
			this.creep.memory.source = source.id;
		} else {
			this.source = Game.getObjectById<Source>(this.creep.memory.source);
		}
		if (!this.creep.memory.config.hasController && !!this.source) {
			if (!!this.creep.memory.keeperLair) {
				this.keeperLair = Game.getObjectById<StructureKeeperLair>(this.creep.memory.keeperLair);
			} else {
				let lairs = this.creep.room.allStructures.filter(
					(s: StructureKeeperLair) => s.structureType === STRUCTURE_KEEPER_LAIR
					&& s.pos.inRangeTo(this.source.pos, 5)
				) as StructureKeeperLair[];
				if (lairs.length > 0) {
					this.keeperLair = lairs.shift();
					this.creep.memory.keeperLair = this.keeperLair.id;
				}
			}
		}
	}
	public findSourceNearContainer(c: StructureContainer): Source {
		let sources = c.room.sources.filter((s: Source) => s.pos.isNearTo(c));
		return sources[0];
	}

	public tryHarvest(): number {
		if (!!this.container && this.creep.carry.energy > (this.creep.carryCapacity * 0.2) && this.container.hits < this.container.hitsMax) {
			return this.creep.repair(this.container);
		} else if (!!this.container && this.creep.carry.energy > (this.creep.carryCapacity * 0.8)) {
			if (this.creep.pos.isNearTo(this.container.pos)) {
				if (_.sum(this.container.store) < this.container.storeCapacity) {
					this.creep.transfer(this.container, RESOURCE_ENERGY);
				} else {
					this.creep.drop(RESOURCE_ENERGY);
				}
			}
		}
		if (this.source.energy > 0) {
			return this.creep.harvest(this.source);
		} else {
			return ERR_NOT_ENOUGH_RESOURCES;
		}
	}

	public moveToHarvest(): void {
		if (!!this.container) {
			if (!this.creep.pos.isEqualTo(this.container.pos)) {
				let pfg: PathFinderGoal = this.createPathFinderMap(<RoomPosition> this.container.pos, 0);
				this.moveTo(pfg);
			} else {
				this.tryHarvest();
			}
		} else {
			if (!this.creep.pos.isNearTo(this.source.pos)) {
				this.moveTo(this.source.pos);
			} else {
				this.tryHarvest();
			}
		}
	}
	public tryEnergyDropOff(): number {
		return this.creep.transfer(this.container, RESOURCE_ENERGY);
	}

	public moveToDropEnergy(): void {
		if (!this.creep.pos.isNearTo(this.container.pos)) {
			this.moveTo(this.container.pos);
		} else if (this.creep.carry.energy > 0) {
			let status = this.tryEnergyDropOff();
			switch (status) {
				case OK:
					break;
				case ERR_FULL:
					this.creep.drop(RESOURCE_ENERGY);
					break;
				case ERR_INVALID_TARGET:
					delete this.creep.memory.container;
					delete this.creep.memory.source;
					break;
				default:
					console.log(`harvester energyDropOff error ${status}`);
			}
		}
	}

	public fleeFromKeeperLair(): boolean {
		if (!!this.keeperLair) {
			if (this.keeperLair.ticksToSpawn < 6) {
				let fleeRange = 6;
				if (this.creep.pos.getRangeTo(this.keeperLair) < fleeRange) {
					let goals = _.map([this.keeperLair], function(t: StructureKeeperLair) { return {pos: t.pos, range: fleeRange}; });
					let path = PathFinder.search(this.creep.pos, goals, {
						flee: true,
						maxRooms: 1,
						plainCost: 2,
						swampCost: 10,
						maxOps: 500,
						roomCallback: this.roomCallback,
					});
					this.creep.move(this.creep.pos.getDirectionTo(path.path[0]));
				}
				return false;
			}
			return true;
		}
		return true;
	}

	public action(): boolean {
		if (this.flee() && this.fleeFromKeeperLair() && !this.shouldIGoHome()) {
			if (!this.source && !!Game.flags[this.creep.memory.config.targetRoom]) {
				this.moveTo(Game.flags[this.creep.memory.config.targetRoom].pos);
				return false;
			}
			if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
				this.moveTo(this.container.pos);
			} else {
				if (this.creep.bagFull) {
					this.moveToDropEnergy();
				} else {
					this.moveToHarvest();
				}
			}
		}
		return true;
	}
}
