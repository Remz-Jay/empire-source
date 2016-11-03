import CreepAction from "../creepAction";

export default class Dismantler extends CreepAction {

	public static PRIORITY: number = global.PRIORITY_DISMANTLER;
	public static MINRCL: number = global.MINRCL_DISMANTLER;
	public static ROLE: string = "Dismantler";

	public static bodyPart = [MOVE, CARRY, CARRY, WORK, WORK];
	public static maxParts = 10;
	public static maxCreeps = 1;
	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const spawn = room.getFreeSpawn();
		const properties: CreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
			target_controller_id: room.controller.id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public static getCreepLimit(room: Room): number {
		return (!!room.memory.dismantle) ? 2 : 0;
	};

	public boosts: string[] = [
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
		RESOURCE_CATALYZED_ZYNTHIUM_ACID, // +300% dismantle effectiveness
	];

	private target: Structure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.target = Game.getObjectById(_.get(this.creep.memory, "target", undefined) as string) as Structure;
		if (!this.target) {
			this.target = this.findTarget();
		}
	}

	public action(): boolean {
		if (!this.getBoosted()) {
			return false;
		}
		if (this.creep.bagEmpty) {
			delete this.creep.memory.dump;
		}
		this.dumpToCloseTarget([STRUCTURE_LINK, STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_POWER_SPAWN, STRUCTURE_NUKER]);
		if (this.creep.bagFull || this.creep.memory.dump) {
			this.creep.memory.dump = true;
			if (!this.creep.pos.isNearTo(this.creep.room.storage)) {
				this.moveTo(this.creep.room.storage.pos);
			}
		} else if (!!this.target) {
			if (!this.creep.pos.isNearTo(this.target.pos)) {
				this.moveTo(this.target.pos);
			} else {
				this.creep.dismantle(this.target);
			}
		}
		this.saveToMemory();
		return true;
	}

	private recycle() {
		this.creep.say("Recycle");
		const spawn = this.creep.room.getFreeSpawn();
		if (!this.creep.pos.isNearTo(spawn)) {
			this.moveTo(this.target.pos);
		} else {
			spawn.recycleCreep(this.creep);
		}
	}

	private saveToMemory(): void {
		_.set(this.creep, "memory.target", this.target.id || undefined);
	}

	private findTarget(): Structure {
		let flag = _(this.creep.room.flags).filter((f: Flag) => f.color === COLOR_YELLOW && f.secondaryColor === COLOR_ORANGE).first();
		if (!!flag) {
			let structure =  _(flag.pos.lookFor<Structure>(LOOK_STRUCTURES)).first();
			if (!!structure) {
				structure.notifyWhenAttacked(false);
				return structure;
			} else {
				flag.remove();
				return undefined;
			}
		} else {
			delete this.creep.room.memory.dismantle;
			this.recycle();
		}
	}
}
