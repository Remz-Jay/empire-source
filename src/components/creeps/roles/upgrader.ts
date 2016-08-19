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
		if (this.tryCollectEnergy() === ERR_NOT_IN_RANGE) {
			this.moveTo(this.targetEnergySource.pos);
		}
	}

	public tryCollectEnergy(): number {
		return this.creep.withdraw(this.targetEnergySource, RESOURCE_ENERGY);
	}

	public moveToController(): void {
		let status: number = this.tryUpgrading();
		switch (status) {
			case ERR_NOT_IN_RANGE:
				this.moveTo(this.targetController.pos);
				break;
			case OK:
				break;
			default:
				console.log(`Upgrader error ${status}`);
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
