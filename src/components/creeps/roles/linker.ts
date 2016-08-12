import CreepAction, {ICreepAction} from "../creepAction";

export interface ILinker {
	action(): boolean;
}

export default class Linker extends CreepAction implements ILinker, ICreepAction {

	public setCreep(creep: Creep) {
		super.setCreep(creep);
	}

	public action(): boolean {
		if (super.action()) {
			let storage: StructureStorage = this.creep.room.storage;
			let linkResult: StructureLink[] = _.filter(this.creep.room.find(FIND_MY_STRUCTURES),
				(s: Structure) => s.structureType === STRUCTURE_LINK && s.pos.isNearTo(storage)) as StructureLink[];
			if (linkResult.length > 0) {
				let link = linkResult[0];
				// let terminalResult: StructureTerminal[] = _.filter(this.creep.room.find(FIND_MY_STRUCTURES),
				// 	(s: Structure) => s.structureType === STRUCTURE_TERMINAL && s.pos.isNearTo(storage)) as StructureTerminal[];
				if (!this.creep.pos.isNearTo(storage)) {
					this.moveTo(storage.pos);
				} else if (!this.creep.pos.isNearTo(link)) {
					this.moveTo(link.pos);
				// } else if (!!terminalResult && terminalResult.length > 0 && !this.creep.pos.isNearTo(terminalResult[0])) {
				// 	this.moveTo(terminalResult[0].pos);
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
}
