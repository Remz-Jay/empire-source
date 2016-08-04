var Worker = require('class.worker');
var Wall = require('class.wall');

function RoleRepairbot() {
	Worker.call(this);
	this.role = 'repair';
	this.minRCL = 2;
	this.bodyPart = [CARRY, CARRY, WORK, MOVE, MOVE, MOVE];
	this.maxParts = 4;
	this.myStructureMultiplier = 0.9;
	this.publicStructureMultiplier = 0.81;

	this.max = function (energyInContainers, room) {
		let num;
		if (room.controller.level < 4) {
			num = 1;
		} else {
			num = _.floor(energyInContainers / 30000);
		}

		return (num > 0) ? num : 0;
	};
	this.repairLogic = function (creep) {
		if (this.creep.memory.repairing && this.creep.carry.energy == 0) {
			delete this.creep.memory.repairing;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say('R:COL');
		}
		if (!this.creep.memory.repairing && this.creep.carry.energy == this.creep.carryCapacity) {
			this.creep.memory.repairing = true;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say('R:REP');
		}

		if (!!this.creep.memory.repairing) {
			if (!this.creep.memory.target) {
				//See if any owned buildings are damaged.
				var target = this.creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
					filter: (structure) => {
						return (
							structure.hits < (structure.hitsMax * this.myStructureMultiplier) &&
							structure.structureType != STRUCTURE_RAMPART
						);
					}
				});
				// No? Try to repair a neutral structure instead.
				if (!target) {
					target = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
						filter: (structure) => {
							return (
								structure.hits < (structure.hitsMax * this.publicStructureMultiplier) &&
								(   structure.structureType == STRUCTURE_ROAD ||
									structure.structureType == STRUCTURE_CONTAINER ||
									structure.structureType == STRUCTURE_STORAGE
								)
							)
						}
					});
				}
				//Still nothing? Fortify Ramparts and Walls if we have spare energy.
				//if(creep.room.energyAvailable / (creep.room.energyCapacityAvailable/100)>50) {
				if (this.creep.room.energyAvailable > (this.creep.room.energyCapacityAvailable * 0.8)) {
					if (!target) {
						target = this.creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
							filter: (structure) => {
								return (
									(
										structure.hits < Memory.config.Rampart.strength ||
										structure.hits < structure.hitsMax * 0.2
									) &&
									structure.structureType == STRUCTURE_RAMPART
								);
							}
						});
						if (!target) {
							var wall = new Wall(creep.room);
							target = wall.getWeakestWall();
						}
					}
				}
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					var spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
					if (creep.pos.isNearTo(spawn)) {
						if (creep.carry.energy > 0) {
							creep.transfer(spawn, RESOURCE_ENERGY);
						}
					} else {
						creep.moveTo(spawn);
					}
				}
			}
			var target = Game.getObjectById(this.creep.memory.target);
			if (!!target) {
				if (target.hits == target.hitsMax) {
					delete this.creep.memory.target;
				}
				var status = this.creep.repair(target);
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
						this.moveTo(target);
						break;
					case ERR_NO_BODYPART:
					default:
						console.log('repairBot.repair.status: this should not happen');
				}
			} else {
				delete this.creep.memory.target;
			}
		} else {
			this.harvestFromContainersAndSources();
		}
	};
	/** @param {Creep} creep **/
	this.run = function (creep) {
		this.creep = creep;
		if (this.renewCreep()) {
			this.pickupResourcesInRange();
			this.repairLogic(creep);
		}
	}
}
RoleRepairbot.prototype = _.create(Worker.prototype, {
	'constructor': RoleRepairbot
});
module.exports = RoleRepairbot;