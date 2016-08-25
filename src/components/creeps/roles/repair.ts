import CreepAction, {ICreepAction} from "../creepAction";
import * as WallManager from "../../walls/wallManager";
import * as RampartManager from "../../ramparts/rampartManager";

export interface IRepair {
	action(): boolean;
}

export default class Repair extends CreepAction implements IRepair, ICreepAction {

	public myStructureMultiplier = 0.9;
	public publicStructureMultiplier = 0.81;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
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
				// See if any owned buildings are damaged.
				let target: Structure = this.creep.pos.findClosestByPath(this.creep.room.myStructures, {
					filter: (structure: Structure) => {
						return (
							structure.hits < (structure.hitsMax * this.myStructureMultiplier) &&
							structure.structureType !== STRUCTURE_RAMPART
						);
					},
					costCallback: this.roomCallback,
				}) as Structure;
				// No? Try to repair a neutral structure instead.
				if (!target) {
					target = this.creep.pos.findClosestByPath(this.creep.room.allStructures, {
						filter: (structure: Structure) => {
							return (
								structure.hits < (structure.hitsMax * this.publicStructureMultiplier) &&
								(   structure.structureType === STRUCTURE_ROAD ||
									structure.structureType === STRUCTURE_CONTAINER ||
									structure.structureType === STRUCTURE_STORAGE
								)
							);
						},
						costCallback: this.roomCallback,
					}) as Structure;
				}
				// Still nothing? Fortify Ramparts and Walls if we have spare energy.
				if (this.creep.room.energyAvailable > (this.creep.room.energyCapacityAvailable * 0.8)) {
					if (!target) {
						let rampart = RampartManager.getWeakestRampart();
						if ((rampart.hits < RampartManager.getAverageStrength()
							&& rampart.hits < WallManager.getAverageStrength())
							|| rampart.hits < rampart.hitsMax * 0.1
						) {
							target = rampart;
						} else {
							target = WallManager.getWeakestWall();
						}
					}
				}
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					let spawn: Spawn = this.creep.pos.findClosestByRange(FIND_MY_SPAWNS) as Spawn;
					if (!!spawn) {
						if (this.creep.pos.isNearTo(spawn)) {
							if (this.creep.carry.energy > 0) {
								this.creep.transfer(spawn, RESOURCE_ENERGY);
							}
						} else {
							this.moveTo(spawn.pos);
						}
					} else {
						this.creep.say("IDLE");
					}
				}
			}
			let target: Structure = Game.getObjectById(this.creep.memory.target) as Structure;
			if (!!target) {
				if (target.hits === target.hitsMax) {
					delete this.creep.memory.target;
				}
				if (!this.creep.pos.inRangeTo(target.pos, 3)) {
					this.moveTo(target.pos);
					let movingTargets = this.creep.room.allStructures.filter((s: Structure) => s.hits < (s.hitsMax * 0.91)
						&& s.pos.inRangeTo(this.creep.pos, 3)
					);
					if (movingTargets.length) {
						this.creep.repair(_.sortBy(movingTargets, ["hits"]).pop());
					}
				} else {
					let status = this.creep.repair(target);
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
		if (!this.renewCreep() || !this.flee()) {
			return false;
		}
		this.repairLogic();
	}
}
