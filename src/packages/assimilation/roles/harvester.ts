import ASMCreepAction from "../assimilationCreepAction";
import ASMHarvesterGovernor from "../governors/harvester";

export interface IASMHarvester {
	action(): boolean;
}

export default class ASMHarvester extends ASMCreepAction implements IASMHarvester {

	public container: StructureContainer;
	public source: Source;
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
	}
	public findSourceNearContainer(c: StructureContainer): Source {
		let sources = c.room.sources.filter((s: Source) => s.pos.isNearTo(c));
		return sources[0];
	}
	public isBagFull(): boolean {
		return (_.sum(this.creep.carry) === this.creep.carryCapacity);
	}

	public tryHarvest(): number {
		if (Game.time % 2 === 0) {
			let targets: Structure[] = this.creep.room.containers.filter(
				(c: Container) => _.sum(c.store) < c.storeCapacity && c.pos.isNearTo(this.creep.pos)
			);
			if (targets.length > 0) {
				this.creep.transfer(targets[0], RESOURCE_ENERGY);
			}
		}
		return this.creep.harvest(this.source);
	}

	public moveToHarvest(): void {
		if (!this.source && !!Game.flags[this.creep.memory.config.targetRoom]) {
			this.moveTo(Game.flags[this.creep.memory.config.targetRoom].pos);
			return;
		}
		if (!this.creep.pos.isNearTo(this.source.pos)) {
			this.moveTo(this.source.pos);
		} else {
			this.tryHarvest();
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
					this.repairInfra(1);
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

	public action(): boolean {
		if (this.flee() && !this.shouldIGoHome()) {
			if (this.creep.room.name !== this.creep.memory.config.targetRoom) {
				this.moveToTargetRoom();
			} else {
				this.nextStepIntoRoom();
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
