var Worker = require('class.worker');
var UtilCreep = require('util.creep');

function RoleHarvester() {
	Worker.call(this);
	this.role = 'harvester';
	this.getBody = function (capacity, energy, numCreeps, rcl) {
		let numParts;

		if (numCreeps > 0) {
			numParts = _.floor((capacity) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
		} else {
			numParts = _.floor((energy) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
		}
		if (numParts < 1) numParts = 1;
		if (numParts > 4) numParts = 4;
		var body = [];
		for (var i = 0; i < numParts; i++) {
			body = body.concat(this.bodyPart);
		}
		return body;

	};
	this.max = function (energyInContainers, room) {
		let max = 2;
		if (room.energyCapacityAvailable < 1200)  max = 4;
		if (room.energyCapacityAvailable < 600)   max = 6;
		return max;
	};
	/** @param {Creep} creep **/
	this.harvesterLogic = function (creep) {
		if (creep.memory.dumping && creep.carry.energy == 0) {
			delete this.creep.memory.dumping;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say('H:HARV');
		}
		if (!creep.memory.dumping && creep.carry.energy == creep.carryCapacity) {
			creep.memory.dumping = true;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say('H:DIST');
		}
		if (creep.memory.dumping) {
			if (!creep.memory.target) {
				//Containers are nearby, fill them first.
				target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure) => {
						return structure.structureType == STRUCTURE_CONTAINER &&
							_.sum(structure.store) < structure.storeCapacity;
					}
				});
				//If all containers are full, move directly to an owned structure.
				if (!target) {
					var target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
						filter: (structure) => {
							return (
									structure.structureType == STRUCTURE_EXTENSION ||
									structure.structureType == STRUCTURE_SPAWN ||
									structure.structureType == STRUCTURE_TOWER
								) && structure.energy < structure.energyCapacity;
						}
					});
				}
				if (!!target) {
					creep.memory.target = target.id;
				} else {
					creep.memory.target = creep.room.controller.id;
				}
			}
			var target = Game.getObjectById(creep.memory.target);
			if (!target) {
				delete this.creep.memory.target;
			} else {
				switch (target.structureType) {
					case STRUCTURE_EXTENSION:
					case STRUCTURE_SPAWN:
					case STRUCTURE_TOWER:
					case STRUCTURE_CONTAINER:
						var status = creep.transfer(target, RESOURCE_ENERGY);
						switch (status) {
							case ERR_NOT_IN_RANGE:
								this.moveTo(target);
								break;
							case ERR_FULL:
								delete this.creep.memory.target;
								break;
							case OK:
								break;
							default:
								console.log('Status ' + status + ' not defined for harvester.dump.spawn');
						}
						break;
					case STRUCTURE_CONTROLLER:
						if (creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
							this.moveTo(target);
						}
						break;
				}
			}
		} else {
			if (!creep.memory.source) {
				let source;
				if (!!creep.memory.preferredSource) {
					source = Game.getObjectById(creep.memory.preferredSource);
				} else {
					source = creep.pos.findClosestByPath(FIND_SOURCES, {
						filter: source => (source.energy >= 100) || source.ticksToRegeneration < 60
					});
				}
				if (!!source) creep.memory.source = source.id;
			}
			if (!!creep.memory.source) {
				let source = Game.getObjectById(creep.memory.source);
				let status = creep.harvest(source);
				switch (status) {
					case ERR_NOT_ENOUGH_RESOURCES:
					case ERR_INVALID_TARGET:
						if (source.ticksToRegeneration < 60 || source.id == creep.memory.preferredSource) {
							this.creep.moveTo(source);
							break;
						}
					case ERR_NOT_OWNER:
					case ERR_FULL:
						//Dump first before harvesting again.
						if (creep.carry.energy != 0) {
							creep.memory.dumping = true;
							delete this.creep.memory.target;
							delete this.creep.memory.source;
							this.creep.say('H:DIST');
						} else {
							delete this.creep.memory.source;
							this.creep.say('H:NEWSRC');
						}
						break;
					case ERR_NOT_IN_RANGE:
						this.moveTo(source);
						break;
					case OK:
						break;
					default:
						console.log('Unhandled ERR in builder.source.harvest:' + status);
				}
				var targets = creep.pos.findInRange(FIND_STRUCTURES, 1, {
					filter: function (s) {
						return s.structureType == STRUCTURE_CONTAINER &&
							_.sum(s.store) < s.storeCapacity
					}
				});
				if (targets.length > 0) {
					creep.transfer(targets[0], RESOURCE_ENERGY);
				}
			} else {
				delete this.creep.memory.source;
			}
		}
	};
	this.run = function (creep) {
		this.creep = creep;
		if (this.renewCreep()) {
			this.harvesterLogic(creep);
		}
	}
}
RoleHarvester.prototype = _.create(Worker.prototype, {
	'constructor': RoleHarvester
});
module.exports = RoleHarvester;