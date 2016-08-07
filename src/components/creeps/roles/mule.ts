import CreepAction, {ICreepAction} from "../creepAction";
type EnergyStructure = Extension | Spawn | Tower;

export interface IMule {

	targetEnergyDropOff: Spawn | Structure;
	targetEnergySource: Spawn | Structure;

	isBagEmpty(): boolean;
	tryCollectEnergy(): number;
	moveToCollectEnergy(): void;
	assignNewTarget(): boolean;

	action(): boolean;
}

export default class Mule extends CreepAction implements IMule, ICreepAction {

	public targetEnergyDropOff: Spawn | Structure;
	public targetEnergySource: Spawn | Structure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);

		this.targetEnergyDropOff = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_dropoff_id);
		this.targetEnergySource = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_source_id);
	}

	public assignNewTarget(blackList: string[] = []): boolean {
		let target: EnergyStructure = <EnergyStructure> this.creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
			filter: (structure: EnergyStructure) => ( blackList.indexOf(structure.id) === -1 &&
				(
					(structure.structureType === STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity)
					|| ((structure.structureType === STRUCTURE_TOWER || structure.structureType === STRUCTURE_SPAWN)
					&& structure.energy < (structure.energyCapacity * 0.8))
				)
			)
		});
		if (!!target) {
			let taken = this.creep.room.find(FIND_MY_CREEPS, {
				filter: (c: Creep) => c.name !== this.creep.name
				&& c.memory.role === this.creep.memory.role
				&& (!!c.memory.target && c.memory.target === target.id)

			});
			if (!!taken && taken.length > 0) {
				blackList.push(target.id);
				return this.assignNewTarget(blackList);
			} else {
				this.targetEnergyDropOff = target;
				this.creep.memory.target_energy_dropoff_id = target.id;
				return true;
			}
		} else {
			return false;
		}
	}

	public isBagEmpty(): boolean {
		return (this.creep.carry.energy === 0);
	}

	public moveToCollectEnergy(): void {
		if (this.tryCollectEnergy() === ERR_NOT_IN_RANGE) {
			this.moveTo(this.targetEnergySource.pos);
		}
	}

	public tryCollectEnergy(): number {
		return this.creep.withdraw(this.targetEnergySource, RESOURCE_ENERGY);
	}

	public action(): boolean {
		super.action();
		return true;
	}

}
