import WarfareCreepAction from "../warfareCreepAction";

export default class Warvester extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Warvester";

	public static maxParts = 25;
	public static maxCreeps = 3;
	public static bodyPart = [CARRY, MOVE];
	public static toughPart = [TOUGH, TOUGH, MOVE];
	public static basePart = [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];

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

	public static getBody(room: Room) {
		return super.getToughBody(room);
	}

	public static getCreepLimit(room: Room): number {
		return this.maxCreeps;
	}

	public sourcePosition: number = 5;

	public warvest(): boolean {
		if (!this.positions) {
			return false;
		}
		if (!this.creep.bagFull && this.positionIterator === this.sourcePosition) {
			if (this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
				let mineralSource: Mineral;
				if (!!this.creep.memory.mineralSource) {
					mineralSource = Game.getObjectById(this.creep.memory.mineralSource) as Mineral;
				} else {
					const mineral = this.creep.room.lookForAt<Mineral>(LOOK_MINERALS, this.positions[this.positionIterator]);
					if (mineral.length > 0) {
						this.creep.memory.mineralSource = mineral[0].id;
						mineralSource = mineral[0];
					}
				}
				if (!!mineralSource) {
					const status = this.creep.harvest(mineralSource);
					if (status === ERR_NOT_ENOUGH_RESOURCES) {
						this.positionIterator = this.creep.memory.positionIterator = this.sourcePosition + 1;
						return true;
					}
					return false;
				} else {
					return true;
				}
			}
		} else if (this.positionIterator === this.sourcePosition && this.creep.bagFull) {
			this.positionIterator = this.creep.memory.positionIterator = this.sourcePosition + 1;
		} else if (this.creep.pos.isNearTo(this.creep.room.terminal)) {
			const status = this.creep.logTransfer(this.creep.room.terminal, this.getMineralTypeFromStore(this.creep));
			if (status === OK) {
				this.creep.say("Dump");
				this.positionIterator = this.creep.memory.positionIterator = 0;
				return false;
			}
		}
		return true;
	}

	public move(): boolean {
		if (!this.positions) {
			return false;
		}
		if (this.positionIterator < this.positions.length) {
			if (!this.creep.pos.isEqualTo(this.positions[this.positionIterator])) {
				const pfg: PathFinderGoal = this.createPathFinderMap(<RoomPosition> this.positions[this.positionIterator], 0);
				// this.creep.say(pfg[0].pos.x + "," + pfg[0].pos.y + "," + pfg[0].range);
				this.moveTo(pfg);
			} else {
				this.positionIterator = ++this.creep.memory.positionIterator;
				return this.move();
			}
			return true;
		}
		return false;
	}

	public action(): boolean {
		if (this.creep.room.name === this.creep.memory.homeRoom && this.creep.bagEmpty) {
			if (this.creep.ticksToLive < 550) {
				this.creep.memory.hasRenewed = false;
			}
			if (!this.renewCreep()) {
				return false;
			}
		}
		if (this.warvest()) {
			this.move();
		}
		return true;
	}
}
