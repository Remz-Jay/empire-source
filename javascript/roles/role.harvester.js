var Worker = require('class.worker');
var UtilCreep = require('util.creep');

function RoleHarvester() {
    Worker.call(this);
    this.role = 'harvester';
    this.getBody = function (capacity, energy, numCreeps) {
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
    this.max = function (energyInContainers, rcl) {
        /**
         var max = 5;
         if (capacity >= 400 && capacity < 550) {
            max = 6;
        } else if (capacity >= 550) {
            max = 8;
        }
         **/
        var max = 2;
        return max;
    };
    /** @param {Creep} creep **/
    this.harvesterLogic = function (creep) {
        if (creep.memory.dumping && creep.carry.energy == 0) {
            creep.memory.dumping = false;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.say('H:HARV');
        }
        if (!creep.memory.dumping && creep.carry.energy == creep.carryCapacity) {
            creep.memory.dumping = true;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.say('H:DIST');
        }
        if (creep.memory.dumping) {
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
                                creep.moveTo(target);
                                break;
                            case ERR_FULL:
                                creep.memory.target = false;
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
            if (creep.memory.source == false) {
                if (creep.memory.preferedSource) {
                    source = Game.getObjectById(creep.memory.preferedSource);
                } else {
                    var source = creep.pos.findClosestByPath(FIND_SOURCES, {
                        filter: (source) => (source.energy >= 100) || source.ticksToRegeneration < 60
                    });
                }
                if (source != null) creep.memory.source = source.id;
            }
            if (creep.memory.source != false && creep.memory.source != null) {
                var source = Game.getObjectById(creep.memory.source);
                var status = creep.harvest(source);
                switch (status) {
                    case ERR_NOT_ENOUGH_RESOURCES:
                    case ERR_INVALID_TARGET:
                        if (source.ticksToRegeneration < 60 || source.id == creep.memory.preferedSource) {
                            creep.moveTo(source);
                            break;
                        }
                    case ERR_NOT_OWNER:
                    case ERR_FULL:
                        //Dump first before harvesting again.
                        if (creep.carry.energy != 0) {
                            creep.memory.dumping = true;
                            creep.memory.target = false;
                            creep.memory.source = false;
                            creep.say('H:DIST');
                        } else {
                            creep.memory.source = false;
                            creep.say('H:NEWSRC');
                        }
                        break;
                    case ERR_NOT_IN_RANGE:
                        creep.moveTo(source);
                        break;
                    case OK:
                        break;
                    default:
                        console.log('Unhandled ERR in builder.source.harvest:' + status);
                }
            } else {
                creep.memory.source = false;
            }
        }
    }
    this.run = function (creep) {
        if(this.renewCreep(creep)) {
            this.harvesterLogic(creep);
        }
    }
};
RoleHarvester.prototype = _.create(Worker.prototype, {
    'constructor': RoleHarvester
});
module.exports = RoleHarvester;