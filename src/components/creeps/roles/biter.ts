import WarfareCreepAction from "../../../packages/warfare/warfareCreepAction";

export default class Biter extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_BITER;
	public static MINRCL: number = global.MINRCL_BITER;
	public static ROLE: string = "Biter";

	public static bodyPart = [ATTACK, ATTACK, MOVE];
	public static maxCreeps = 1;
	public static maxParts = 9;

	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const properties: CreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public static getCreepLimit(room: Room): number {
		return (room.hostileCreeps.length > 2) ? 1 : 0;
	}

	public setCreep(creep: Creep) {
		super.setCreep(creep);
	}

	public move(): boolean {
		if (this.creep.room.hostileCreeps.length > 0) {
			const hostile = this.creep.pos.findClosestByRange(this.creep.room.hostileCreeps);
			const rampart = hostile.pos.findClosestByRange(this.creep.room.myGroupedStructures[STRUCTURE_RAMPART]);
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
