var Worker = require('class.worker');
var _ = require('lodash');

function RoleBuilder() {
	Worker.call(this);
	this.role = 'builder';

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
			creep.memory.building = false;
			creep.memory.target = false;
			creep.memory.source = false;
			creep.memory.idle = false;
			creep.say('B:COL');
		}
		if (!creep.memory.building && !creep.memory.idle &&
			creep.carry.energy == creep.carryCapacity
		) {
			creep.memory.building = true;
			creep.memory.idle = false;
			creep.memory.target = false;
			creep.memory.source = false;
			creep.say('B:BUILD');
		}

		if (creep.memory.building) {
			if (creep.memory.target == false) {
				var target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
				if (target != null) {
					creep.memory.target = target.id;
				} else {
					//nothing to build. return energy.
					creep.memory.building = false;
					creep.memory.idle = true;
					creep.memory.target = false;
					creep.memory.source = false;
					creep.say('B:IDLE');
					//this.moveTo(creep.pos.findClosestByPath(FIND_MY_SPAWNS));
				}
			}
			var target = Game.getObjectById(creep.memory.target);
			if (target != null) {
				if (creep.build(target) == ERR_NOT_IN_RANGE) {
					this.moveTo(target);
				}
			} else {
				creep.memory.target = false;
			}
		} else if (creep.memory.idle) {
			//scan for sites and return to active duty when found
			var target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
			if (target != null) {
				creep.memory.target = target.id;
				creep.memory.idle = false;
				creep.memory.building = true;
			} else {
				/**
				 if(creep.carry.energy > 0) {
                    if (creep.memory.target == false) {
                        //Containers are nearby, fill them first.
                        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                            filter: (structure) => {
                                return structure.structureType == STRUCTURE_CONTAINER &&
                                    _.sum(structure.store) < structure.storeCapacity;
                            }
                        });

                        //If all containers are full, move directly to an owned structure.
                        if (target == null) {
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
                        if (target != null) {
                            creep.memory.target = target.id;
                        } else {
                            creep.memory.target = creep.room.controller.id;
                        }
                    }
                    var target = Game.getObjectById(creep.memory.target);
                    if (target == null) {
                        creep.memory.target = false;
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
                                        creep.memory.target = false;
                                        break;
                                    case OK:
                                        break;
                                    default:
                                        console.log('Status ' + status + ' not defined for builder.dump');
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
                **/
				//nothing to build. return energy.
				creep.memory.building = false;
				creep.memory.idle = true;
				creep.memory.target = false;
				creep.memory.source = false;
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
				creep.say('B:IDLE!');
			}
			//}
		} else {
			if (creep.memory.source == false) {
				//Prefer energy from containers
				var source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure) => structure.structureType == STRUCTURE_CONTAINER &&
					structure.store[RESOURCE_ENERGY] > 100
				});
				//Go to source otherwise
				if (source == null) {
					source = creep.pos.findClosestByPath(FIND_SOURCES, {
						filter: (source) => (source.energy > 100) || source.ticksToRegeneration < 30
					});
				}
				if (source != null) creep.memory.source = source.id;
			}
			if (creep.memory.source != false) {
				var source = Game.getObjectById(creep.memory.source);
				if (source instanceof Structure) { //Sources aren't structures
					var status = creep.withdraw(source, RESOURCE_ENERGY);
					switch (status) {
						case ERR_NOT_ENOUGH_RESOURCES:
						case ERR_INVALID_TARGET:
						case ERR_NOT_OWNER:
						case ERR_FULL:
							creep.memory.source = false;
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
							creep.memory.source = false;
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
			this.pickupResourcesInRange(creep);
			this.builderLogic(creep);
		}
	}
}
RoleBuilder.prototype = _.create(Worker.prototype, {
	'constructor': RoleBuilder
});
module.exports = RoleBuilder;