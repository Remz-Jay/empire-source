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

	public isTaken(target: Structure) {
		let taken = this.creep.room.myCreeps.filter((c: Creep) => c.name !== this.creep.name
		&& c.memory.role.toUpperCase() === this.creep.memory.role.toUpperCase()
		&& (!!c.memory.target && c.memory.target === target.id));
		return (!!taken && taken.length > 0) ? true : false;
	}

	public findNewTarget(blackList: string[] = []): Structure {
		let target: Structure = undefined;
		// See if any owned buildings are damaged.
		if (this.creep.room.myStructures.length > 0) {
			let targets = this.creep.room.myStructures.filter((s: OwnedStructure) =>
				blackList.indexOf(s.id) === -1
				&& s.hits < (s.hitsMax * this.myStructureMultiplier)
				&& s.structureType !== STRUCTURE_RAMPART
			);
			if (targets.length > 0) {
				target = _.sortBy(targets, "hits").shift();
				if (this.isTaken(target)) {
					blackList.push(target.id);
					return this.findNewTarget(blackList);
				}
			}
		}
		// No? Try to repair a neutral structure instead.
		if (!target) {
			let targets = this.creep.room.allStructures.filter((s: Structure) =>
				blackList.indexOf(s.id) === -1
				&& s.hits < (s.hitsMax * this.publicStructureMultiplier) &&
				(   s.structureType === STRUCTURE_ROAD ||
					s.structureType === STRUCTURE_CONTAINER ||
					s.structureType === STRUCTURE_STORAGE
				)
			);
			if (targets.length > 0) {
				target = _.sortBy(targets, "hits").shift();
				if (this.isTaken(target)) {
					blackList.push(target.id);
					return this.findNewTarget(blackList);
				}
			}
		}
		// Still nothing? Fortify Ramparts and Walls if we have spare energy.
		if (!target && this.creep.room.energyAvailable > (this.creep.room.energyCapacityAvailable * 0.8)) {
			let avgRampart = RampartManager.getAverageStrength();
			let avgWall = WallManager.getAverageStrength();
			if (avgWall < avgRampart) {
				target = WallManager.getWeakestWall();
			} else {
				let rampart = RampartManager.getWeakestRampart();
				if (
					blackList.indexOf(rampart.id) === -1
					&& (rampart.hits < RampartManager.getAverageStrength() && rampart.hits < WallManager.getAverageStrength())
					|| rampart.hits < (rampart.hitsMax * 0.1)
				) {
					target = rampart;
				} else {
					target = WallManager.getWeakestWall();
				}
			}
		}
		return target;
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
				let target = this.findNewTarget();
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					let spawn: Spawn = this.creep.room.mySpawns[0];
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
						this.creep.repair(_.sortBy(movingTargets, "hits").shift());
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
		if (this.creep.room.myConstructionSites.length > 0) {
			this.creep.memory.role = "Builder";
		}
		if (!this.renewCreep() || !this.flee()) {
			return false;
		}
		this.repairLogic();
	}
}
