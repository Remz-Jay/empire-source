import CreepAction, {ICreepAction} from "../creepAction";

export interface ILinker {
	action(): boolean;
}

export default class Linker extends CreepAction implements ILinker, ICreepAction {

	public setCreep(creep: Creep) {
		super.setCreep(creep);
	}

	public action(): boolean {
		super.action();
		if (!this.renewCreep()) return;
		let storage = this.creep.room.storage;
		let link = _.filter(this.creep.room.find(FIND_MY_STRUCTURES),
			s => s.structureType === STRUCTURE_LINK && s.pos.isNearTo(storage));

		if(link.length > 0) {
			link = link[0];
			if(!this.creep.pos.isNearTo(storage)) {
				this.moveTo(storage);
			} else if(!creep.pos.isNearTo(link)) {
				this.moveTo(link);
			} else {
				if (link.energy < 400) {
					this.creep.withdraw(storage, RESOURCE_ENERGY, (400 - link.energy));
					this.creep.transfer(link, RESOURCE_ENERGY);
				} else if (link.energy > 400) {
					this.creep.withdraw(link, RESOURCE_ENERGY, (link.energy - 400));
				} else {
					this.creep.transfer(storage, RESOURCE_ENERGY);
				}
			}
		}

		return true;
	}

}
