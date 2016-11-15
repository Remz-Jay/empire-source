import WarfareCreepAction from "../warfareCreepAction";

export default class WarMule extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "WarMule";

	public static maxParts = 25;
	public static maxCreeps = 3;
	public static bodyPart = [CARRY, MOVE]; // 1850 carry total
	public static basePart = [CARRY, MOVE];

	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}
	public static getBody(room: Room): string[] {
		return super.getToughBody(room);
	}

	public powerBankDuty: boolean = true;
	public boosts: string[] = [
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
		RESOURCE_CATALYZED_KEANIUM_ACID, // +150 capacity
	];
	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
	}

	public move() {
		if (!this.moveUsingPositions()) {
			if (!this.creep.bagEmpty) {
				const storage = Game.rooms[this.creep.memory.homeRoom].storage;
				if (!!storage && !this.creep.pos.isNearTo(storage.pos)) {
					// get in range
					this.moveTo(storage.pos);
					this.creep.say("Storage");
				} else {
					this.creep.logTransfer(storage, this.getMineralTypeFromStore(this.creep));
				}
			} else {
				delete this.creep.memory.full;
				this.positionIterator = this.creep.memory.positionIterator = 0;
			}
		} else {
			this.creep.say("Mup");
		}
	}

	public action(): boolean {
		if (this.getBoosted()) {
			this.move();
			if (!this.creep.bagFull && this.creep.room.name !== this.creep.memory.homeRoom) {
				this.withdrawFromCloseTarget([STRUCTURE_EXTENSION], true);
				this.creep.pickupResourcesInRange();
			}
		}
		return true;
	}
}
