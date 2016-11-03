import CreepAction from "../creepAction";

export default class Repair extends CreepAction {

	public static PRIORITY: number = global.PRIORITY_REPAIR;
	public static MINRCL: number = global.MINRCL_REPAIR;
	public static ROLE: string = "Repair";

	public static bodyPart = [CARRY, CARRY, WORK, WORK, MOVE, MOVE];
	public static maxParts = 5;
	public static maxCreeps = 1;

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
		if (room.controller.level === 8) {
			return 0;
		}
		return 0;
	};
	public boosts: string[] = [
		RESOURCE_CATALYZED_LEMERGIUM_ACID, // +100% repair and build without increasing the energy cost
	];
	private target: Structure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.target = Game.getObjectById(this.creep.memory.target) as Structure;
		if (this.creep.bagEmpty) {
			this.target = this.creep.room.storage;
			this.creep.memory.target = this.target.id;
		}
		if (!this.target || (this.target === this.creep.room.storage && !this.creep.bagEmpty)) {
			this.target = this.findTarget();
			this.creep.memory.repairCounter = 0;
			this.creep.memory.target = this.target.id;
		}
		if (this.creep.carrySum > this.creep.carry.energy) {
			this.target = this.creep.room.storage;
			this.creep.memory.target = this.target.id;
			if (this.creep.pos.isNearTo(this.target)) {
				this.creep.transfer(this.target, this.getMineralTypeFromStore(this.creep));
			}
		}
		if (!!this.creep.memory.repairCounter
			&& this.creep.memory.repairCounter > 50
			&& !!this.target
			&& (this.target.structureType === STRUCTURE_WALL || this.target.structureType === STRUCTURE_RAMPART)
		) {
			this.target = this.findTarget();
			this.creep.memory.repairCounter = 0;
			this.creep.memory.target = this.target.id;
		}
	}

	public action(): boolean {
		if (!this.getBoosted()) {
			return false;
		}
		if (!this.creep.bagFull) {
			this.withdrawFromCloseTarget([], RESOURCE_ENERGY);
		}
		if (!this.creep.bagEmpty) {
			this.repair();
		}
		this.move();
		return true;
	}
	private repair(): boolean {
		if (!!this.target && this.creep.pos.inRangeTo(this.target.pos, 3)) {
			this.creep.repair(this.target);
			if (!this.creep.memory.repairCounter) {
				this.creep.memory.repairCounter = 1;
			} else {
				this.creep.memory.repairCounter++;
			}
		} else {
			this.passingRepair();
		}
		return true;
	}
	private move(): boolean {
		if (!!this.target) {
			if (this.target === this.creep.room.storage && !this.creep.pos.isNearTo(this.target)) {
				this.moveTo(this.target.pos);
			} else if (!this.creep.pos.inRangeTo(this.target.pos, 3)) {
				const pfg = this.createPathFinderMap(this.target.pos, 3);
				this.moveTo(pfg);
			}
		}
		return true;
	}
	private findTarget(): Structure {
		let target: Structure;
		const minRampart = this.creep.room.weakestRampart;
		const minWall = this.creep.room.weakestWall;
		if (!!minRampart && (!minWall || minRampart.hits < minWall.hits)) {
			target = minRampart;
		} else if (!!minWall) {
			target = minWall;
		}
		return target;
	}
}
