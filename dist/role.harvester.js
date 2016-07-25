var roleHarvester = {
    body: [WORK,CARRY,CARRY,MOVE,MOVE], // 100 + 50 + 50 + 50 + 50 = 300
    /**
     *
     * @param capacity
     * @returns {Array}
     */
    getBody: function(capacity) {
        var body = this.body;
        if (capacity >= 400 && capacity < 550) {
            body = [WORK,WORK,CARRY,CARRY,MOVE,MOVE]; //400
        } else if (capacity >= 550) {
            body = [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE]; //550
        }
        return body;
    },
    role: 'harvester',
    max: function(){ return 5; },
    /** @param {Creep} creep **/
    run: function (creep) {
        if (creep.memory.dumping && creep.carry.energy == 0) {
            creep.memory.dumping = false;
            creep.memory.target = false;
            creep.say('harvesting');
        }
        if (!creep.memory.dumping && creep.carry.energy == creep.carryCapacity) {
            creep.memory.dumping = true;
            creep.memory.target = false;
            creep.say('Dumping Energy');
        }
        if (creep.memory.dumping) {
            if (creep.memory.target == false) {
                var target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (structure) => {
                        return (
                            structure.structureType == STRUCTURE_EXTENSION ||
                            structure.structureType == STRUCTURE_SPAWN ||
                            structure.structureType == STRUCTURE_TOWER
                            ) && structure.energy < structure.energyCapacity;
                    }
                });
                //No owned structure was found. Try to fill containers.
                if (target == null) {
                    target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: (structure) => {
                            return  structure.structureType == STRUCTURE_CONTAINER &&
                                    _.sum(structure.store) < structure.storeCapacity;
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
                                creep.moveTo(target);
                                break;
                            case ERR_FULL:
                                creep.memory.dumping = false;
                                break;
                            case OK:
                                break;
                            default:
                                console.log('Status ' + status + ' not defined for harvester.dump.spawn');
                        }
                        break;
                    case STRUCTURE_CONTROLLER:
                        if (creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(target);
                        }
                        break;
                }
            }
        } else {
            var source = creep.pos.findClosestByPath(FIND_SOURCES, {
                filter: (source) => (source.energy > 100) || source.ticksToRegeneration < 30
            });
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
        }
    }
};

module.exports = roleHarvester;