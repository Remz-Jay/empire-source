import ASMCreepAction from "../assimilationCreepAction";

export interface IASMHarvester {
	action(): boolean;
}

export default class ASMHarvester extends ASMCreepAction implements IASMHarvester {

	public container: StructureContainer;
	public source: Source;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.container = Game.getObjectById<StructureContainer>(this.creep.memory.container);
		if (!this.creep.memory.source) {
			let source = this.findSourceNearContainer(this.container);
			this.source = source;
			this.creep.memory.source = source.id;
		} else {
			this.source = Game.getObjectById<Source>(this.creep.memory.source);
		}
	}
	public findSourceNearContainer(c: StructureContainer): Source {
		let sources = c.pos.findInRange<Source>(FIND_SOURCES, 1);
		return sources[0];
	}
	public isBagFull(): boolean {
		return (this.creep.carry.energy === this.creep.carryCapacity);
	}

	public tryHarvest(): number {
		let targets: StructureContainer[] = this.creep.pos.findInRange(FIND_STRUCTURES, 1, {
			filter: function (s: StructureContainer) {
				return s.structureType === STRUCTURE_CONTAINER &&
					_.sum(s.store) < s.storeCapacity;
			},
		}) as StructureContainer[];
		if (targets.length > 0) {
			this.creep.transfer(targets[0], RESOURCE_ENERGY);
		}
		return this.creep.harvest(this.source);
	}

	public moveToHarvest(): void {
		if (this.tryHarvest() === ERR_NOT_IN_RANGE) {
			if (!this.creep.memory.targetPath) {
				if (!this.findNewPath(this.source)) {
					this.creep.say("HALP!");
				}
			} else {
				let path = this.deserializePathFinderPath(this.creep.memory.targetPath);
				this.moveByPath(path, this.source);
			}
		} else {
			delete this.creep.memory.targetPath;
		}
	}
	public tryEnergyDropOff(): number {
		return this.creep.transfer(this.container, RESOURCE_ENERGY);
	}

	public moveToDropEnergy(): void {
		let status = this.tryEnergyDropOff();
		switch (status) {
			case OK:
				break;
			case ERR_NOT_IN_RANGE:
				this.moveTo(this.container.pos);
				break;
			case ERR_FULL:
				this.repairInfra(1);
				break;
			default:
				console.log(`harvester energyDropOff error ${status}`);
		}
	}

	public action(): boolean {
		if (super.renewCreep()) {
			this.creep.say(this.creep.memory.config.targetRoom);
			if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
				this.moveToTargetRoom();
			} else {
				if (this.isBagFull()) {
					this.moveToDropEnergy();
				} else {
					this.moveToHarvest();
				}
			}
		}
		return true;
	}
}
