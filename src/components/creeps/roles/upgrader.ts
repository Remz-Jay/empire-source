import CreepAction, {ICreepAction} from "../creepAction";

export interface IUpgrader {

	targetController: Controller;
	targetEnergySource: Spawn | Structure;

	isBagEmpty(): boolean;
	tryUpgrading(): number;
	tryCollectEnergy(): number;
	moveToCollectEnergy(): void;
	moveToController(): void;

	action(): boolean;
}

export default class Upgrader extends CreepAction implements IUpgrader, ICreepAction {

	public targetController: Controller;
	public targetEnergySource: Spawn | Structure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);

		this.targetController = Game.getObjectById<Controller>(this.creep.memory.target_controller_id);
		this.targetEnergySource = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_source_id);
	}

	public isBagEmpty(): boolean {
		return (this.creep.carry.energy === 0);
	}

	public tryUpgrading(): number {
		return this.creep.upgradeController(this.targetController);
	}

	public moveToCollectEnergy(): void {
		if (!this.creep.pos.isNearTo(this.targetEnergySource.pos)) {
			this.moveTo(this.targetEnergySource.pos);
		} else {
			this.tryCollectEnergy();
		}
	}

	public tryCollectEnergy(): number {
		return this.creep.withdraw(this.targetEnergySource, RESOURCE_ENERGY);
	}

	public moveToController(): void {
		if (!this.creep.pos.inRangeTo(this.targetController.pos, 3)) {
			this.moveTo(this.targetController.pos);
		} else {
			this.tryUpgrading();
		}
	}

	public upgraderLogic() {
		if (this.creep.memory.dumping && this.creep.carry.energy === 0) {
			delete this.creep.memory.dumping;
			delete this.creep.memory.source;
			this.creep.say("U:COL");
		}
		if (!this.creep.memory.dumping && this.creep.carry.energy === this.creep.carryCapacity) {
			this.creep.memory.dumping = true;
			delete this.creep.memory.source;
			this.creep.say("U:UPGR");
		}
		if (this.creep.memory.dumping) {
			let target = this.creep.room.controller;
			if (this.creep.pos.getRangeTo(target) > 2) {
				this.moveTo(target.pos);
				this.creep.upgradeController(target);
			} else {
				this.creep.upgradeController(target);
				if (Game.time % _.random(0, 27) === 0 ) {
					this.creep.say("_/=\\\u0CA0_", true);
				}
			}
			if (this.creep.carry.energy < 50) {
				// see if we can get some from a nearby link
				let target = this.creep.room.myStructures.filter((l: StructureLink) => l.structureType === STRUCTURE_LINK
					&& l.energy > 0
					&& l.pos.isNearTo(this.creep.pos)
				);
				if (!!target) {
					this.creep.withdraw(target.shift(), RESOURCE_ENERGY);
				}
			}
		} else {
			this.harvestFromContainersAndSources();
		}
	};

	public action(): boolean {
		if (super.action() && this.flee()) {
			this.upgraderLogic();
		}
		return true;
	}

}
