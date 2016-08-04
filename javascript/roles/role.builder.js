var Worker = require('class.worker');
var _ = require('lodash');

function RoleBuilder() {
	Worker.call(this);
	this.role = 'builder';
	this.maxParts = -1;
	this.max = function (energyInContainers, room) {
		var sites = _.filter(Game.constructionSites, function (cs) {
			return cs.pos.roomName == room.name;
		}, this);
		if (sites.length > 0) {
			return 1;
		} else {
			return 0;
		}
	};
	this.builderLogic = function (creep) {
		if (creep.memory.building && creep.carry.energy == 0) {
			delete this.creep.memory.building;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.target;
			this.creep.say('B:COL');
		}
		if (!creep.memory.building && !creep.memory.idle &&
			creep.carry.energy == creep.carryCapacity
		) {
			creep.memory.building = true;
			delete this.creep.memory.target;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say('B:BUILD');
		}

		if (creep.memory.building) {
			if (!creep.memory.target) {
				var target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
				if (!!target) {
					creep.memory.target = target.id;
				} else {
					//nothing to build. return energy.
					delete this.creep.memory.building;
					creep.memory.idle = true;
					delete this.creep.memory.target;
					delete this.creep.memory.source;
					this.creep.say('B:IDLE');
					//this.moveTo(creep.pos.findClosestByPath(FIND_MY_SPAWNS));
				}
			}
			var target = Game.getObjectById(creep.memory.target);
			if (!!target) {
				if (creep.build(target) == ERR_NOT_IN_RANGE) {
					this.moveTo(target);
				}
			} else {
				delete this.creep.memory.target;
			}
		} else if (creep.memory.idle) {
			//scan for sites and return to active duty when found
			var target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
			if (!!target) {
				creep.memory.target = target.id;
				delete this.creep.memory.target;
				creep.memory.building = true;
			} else {
				//nothing to build. return energy.
				delete this.creep.memory.building;
				creep.memory.idle = true;
				delete this.creep.memory.target;
				delete this.creep.memory.source;
				var spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
				if (creep.pos.isNearTo(spawn)) {
					if (creep.carry.energy > 0) {
						creep.transfer(spawn, RESOURCE_ENERGY);
					} else {
						spawn.recycleCreep(creep);
					}
				} else {
					creep.moveTo(spawn);
				}
				this.creep.say('B:IDLE!');
			}
			//}
		} else {
			if (!creep.memory.source) {
				//Prefer energy from containers
				var source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: structure => (structure.structureType == STRUCTURE_CONTAINER
					|| structure.structureType == STRUCTURE_STORAGE)
					&& structure.store[RESOURCE_ENERGY] > 100
				});
				//Go to source otherwise
				if (!source) {
					source = creep.pos.findClosestByPath(FIND_SOURCES, {
						filter: (source) => (source.energy > 100) || source.ticksToRegeneration < 30
					});
				}
				if (!!source) creep.memory.source = source.id;
			}
			if (!!creep.memory.source) {
				var source = Game.getObjectById(creep.memory.source);
				if (source instanceof Structure) { //Sources aren't structures
					var status = creep.withdraw(source, RESOURCE_ENERGY);
					switch (status) {
						case ERR_NOT_ENOUGH_RESOURCES:
						case ERR_INVALID_TARGET:
						case ERR_NOT_OWNER:
						case ERR_FULL:
							delete this.creep.memory.source;
							break;
						case ERR_NOT_IN_RANGE:
							this.moveTo(source);
							break;
						case OK:
							break;
						default:
							console.log('Unhandled ERR in builder.source.container:' + status);
					}
				} else {
					var status = creep.harvest(source);
					switch (status) {
						case ERR_NOT_ENOUGH_RESOURCES:
						case ERR_INVALID_TARGET:
						case ERR_NOT_OWNER:
						case ERR_FULL:
							delete this.creep.memory.source;
							break;
						case ERR_NOT_IN_RANGE:
							this.moveTo(source);
							break;
						case OK:
							break;
						default:
							console.log('Unhandled ERR in builder.source.harvest:' + status);
					}
				}
			}
		}
	};
	/** @param {Creep} creep **/
	this.run = function (creep) {
		this.creep = creep;
		if (this.renewCreep()) {
			this.pickupResourcesInRange();
			this.builderLogic(creep);
		}
	}
}
RoleBuilder.prototype = _.create(Worker.prototype, {
	'constructor': RoleBuilder
});
module.exports = RoleBuilder;