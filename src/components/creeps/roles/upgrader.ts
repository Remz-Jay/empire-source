import CreepAction, {ICreepAction} from "../creepAction";

export interface IUpgrader {

	targetController: Controller;
	targetEnergySource: Spawn | Structure;

	tryUpgrading(): number;
	tryCollectEnergy(): number;
	moveToCollectEnergy(): void;
	moveToController(): void;

	action(): boolean;
}

export default class Upgrader extends CreepAction implements IUpgrader, ICreepAction {

	public targetController: Controller;
	public targetEnergySource: Spawn | Structure;
	public boosts: string[] = [
		RESOURCE_CATALYZED_GHODIUM_ACID, // +100% upgradeController effectiveness without increasing the energy cost
	];

	public setCreep(creep: Creep) {
		super.setCreep(creep);

		this.targetController = Game.getObjectById<Controller>(this.creep.memory.target_controller_id);
		this.targetEnergySource = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_source_id);
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
		if (!this.creep.memory.dumping && this.creep.carry.energy  > 0) {
			this.creep.memory.dumping = true;
			delete this.creep.memory.source;
			this.creep.say("U:UPGR");
		}
		if (this.creep.memory.dumping) {
			this.moveToController();
			if (this.creep.carry.energy < 50) {
				// see if we can get some from a nearby link
				const target = this.creep.room.myStructures.filter((l: StructureLink) => l.structureType === STRUCTURE_LINK
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
		if (this.getBoosted() && super.action()) {
			this.upgraderLogic();
		}
		return true;
	}

}
