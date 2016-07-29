import CreepAction, {ICreepAction} from "../creepAction";

export interface IBuilder {

	targetConstructionSite: ConstructionSite;
	targetEnergySource: Spawn | Structure;

	isBagEmpty(): boolean;
	tryBuilding(): number;
	tryCollectEnergy(): number;
	moveToCollectEnergy(): void;
	moveToConstructionSite(): void;

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
			this.moveTo(this.targetEnergySource);
		}
	}

	public tryCollectEnergy(): number {
		return this.creep.withdraw(this.targetEnergySource, RESOURCE_ENERGY);
	}

	public moveToConstructionSite(): void {
		let status: number = this.tryBuilding();
		switch (status) {
			case ERR_NOT_IN_RANGE:
				this.moveTo(this.targetConstructionSite);
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

	public action(): boolean {
		if (this.needsRenew()) {
			this.moveToRenew();
		} else if (this.isBagEmpty()) {
			this.moveToCollectEnergy();
		} else {
			this.moveToConstructionSite();
		}

		return true;
	}

}
