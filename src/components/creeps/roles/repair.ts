import CreepAction from "../creepAction";

export default class Repair extends CreepAction {

	public static PRIORITY: number = global.PRIORITY_REPAIR;
	public static MINRCL: number = global.MINRCL_REPAIR;
	public static ROLE: string = "Repair";

	public static bodyPart = [CARRY, CARRY, WORK, WORK, MOVE, MOVE];
	public static maxParts = 4;
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
		if (room.controller.level === 8) {
			return 1;
		}
		return 0;
	};

	public myStructureMultiplier = 0.9;
	public publicStructureMultiplier = 0.81;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
	}

	public isTaken(target: Structure): boolean {
		return (!!_.get(global.tickCache.rolesByRoom, `${Repair.ROLE}.${this.creep.room.name}`, [])
			.filter((c: Creep) => c.name !== this.creep.name && (!!c.memory.target && c.memory.target === target.id))
			.length);
	}

	public findNewTarget(): Structure {
		let target: Structure = undefined;
		// See if any owned buildings are damaged.
		if (this.creep.room.myStructures.length > 0) {
			target = _(this.creep.room.myStructures).filter((s: OwnedStructure) =>
			s.hits < (s.hitsMax * this.myStructureMultiplier)
			&& s.structureType !== STRUCTURE_RAMPART
			&& !this.isTaken(s))
				.sortBy("hits")
				.first();
		}
		if (!!target) {
			return target;
		} else {
			const repairStructures = _.union(
				this.creep.room.groupedStructures[STRUCTURE_ROAD],
				this.creep.room.groupedStructures[STRUCTURE_CONTAINER],
				this.creep.room.groupedStructures[STRUCTURE_STORAGE],
			);
			target = _(repairStructures).filter((s: Structure) =>
				s.hits < (s.hitsMax * this.publicStructureMultiplier)
				&& !this.isTaken(s))
				.sortBy("hits")
				.first();
			if (!!target) {
				return target;
			} else if (this.creep.room.energyAvailable > (this.creep.room.energyCapacityAvailable * 0.8)) {
				// No? Try to repair a neutral structure instead.
				// Still nothing? Fortify Ramparts and Walls if we have spare energy.
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
	}

	public repairLogic() {
		if (this.creep.memory.repairing && this.creep.carry.energy === 0) {
			delete this.creep.memory.repairing;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say("R:COL");
		}
		if (!this.creep.memory.repairing && this.creep.carry.energy === this.creep.carryCapacity) {
			this.creep.memory.repairing = true;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say("R:REP");
		}

		if (!!this.creep.memory.repairing) {
			if (!this.creep.memory.target) {
				const target = this.findNewTarget();
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					const spawn: Spawn = this.creep.room.mySpawns[0];
					if (!!spawn) {
						if (this.creep.pos.isNearTo(spawn)) {
							if (this.creep.carry.energy > 0) {
								this.creep.logTransfer(spawn, RESOURCE_ENERGY);
							}
						} else {
							this.moveTo(spawn.pos);
						}
					} else {
						this.creep.say("IDLE");
					}
				}
			}
			const target: Structure = Game.getObjectById(this.creep.memory.target) as Structure;
			if (!!target) {
				if (target.hits === target.hitsMax) {
					delete this.creep.memory.target;
				}
				if (!this.creep.pos.inRangeTo(target.pos, 3)) {
					this.moveTo(target.pos);
					const movingTarget: Structure = _(this.creep.safeLook(LOOK_STRUCTURES, 3)).map("structure").filter(
						(s: Structure) => s.hits < (s.hitsMax * 0.91)
					).sortBy("hits").first() as Structure;
					if (!!movingTarget) {
						this.creep.repair(movingTarget);
					}
				} else {
					const status = this.creep.repair(target);
					switch (status) {
						case OK:
							break;
						case ERR_BUSY:
						case ERR_INVALID_TARGET:
						case ERR_NOT_OWNER:
							delete this.creep.memory.target;
							break;
						case ERR_NOT_ENOUGH_RESOURCES:
							delete this.creep.memory.target;
							delete this.creep.memory.repairing;
							break;
						case ERR_NOT_IN_RANGE:
						case ERR_NO_BODYPART:
						default:
							console.log("repairBot.repair.status: this should not happen");
					}
				}
			} else {
				delete this.creep.memory.target;
			}
		} else {
			this.harvestFromContainersAndSources();
		}
	};

	public action(): boolean {
		this.repairLogic();
		return true;
	}
}
