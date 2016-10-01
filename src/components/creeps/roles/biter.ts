import WarfareCreepAction from "../../../packages/warfare/warfareCreepAction";

export interface IBiter {
	action(): boolean;
}

export default class Biter extends WarfareCreepAction implements IBiter {

	public setCreep(creep: Creep) {
		super.setCreep(creep);
	}
	public move(): boolean {
		if (this.creep.room.hostileCreeps.length > 0) {
			const hostile = this.creep.pos.findClosestByRange(this.creep.room.hostileCreeps);
			const rampart = hostile.pos.findClosestByRange(this.creep.room.myStructures.filter((s: OwnedStructure) => s.structureType === STRUCTURE_RAMPART));
			if (!!rampart) {
				if (!this.creep.pos.isEqualTo(rampart.pos)) {
					const pfg: PathFinderGoal = this.createPathFinderMap(<RoomPosition> rampart.pos, 0);
					this.moveTo(pfg);
					return false;
				} else {
					return true;
				}
			} else {
				if (!this.creep.pos.isNearTo(hostile.pos)) {
					this.moveTo(hostile.pos);
					return false;
				} else {
					return true;
				}
			}
		} else {
			return true;
		}
	}
	public action(): boolean {
		this.move();
		this.attack();
		return true;
	}
}
