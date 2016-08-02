var Creep = require('class.creep');
var UtilCreep = require('util.creep');

function RoleMule() {
    Creep.call(this);
    this.minRCL = 2;
    this.bodyPart = [CARRY, MOVE]; //50 + 50 + 100 + 100 = 300
    this.role = 'mule';
    this.maxCreeps = 2;
    this.max = function(energyInContainers, room) {
        if (room.controller.level < 3) return 1;
        return this.maxCreeps;
    };
    this.getBody = function (capacity, energy, numCreeps, rcl) {
        let numParts;
        if(numCreeps>0) {
            numParts = _.floor((capacity-100) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        } else {
            numParts = _.floor((energy-100) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        }
        if(numParts < 1) numParts = 1;
        if(numParts > 15) numParts = 15;
        var body = [];
        for (var i = 0; i < numParts; i++) {
            body = body.concat(this.bodyPart);
        }
        return body.concat([WORK]);

    };
    this.scanForTargets = function(creep) {
        var target = creep.pos.findClosestByPath(FIND_MY_SPAWNS, {
            filter: (structure) => {
                return structure.energy < (structure.energyCapacity/2);
            }
        });
        if (target == null) {
            var target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (structure) => {
                    return (
                            structure.structureType == STRUCTURE_EXTENSION ||
                            structure.structureType == STRUCTURE_TOWER ||
                            structure.structureType == STRUCTURE_SPAWN
                        ) && structure.energy < (structure.energyCapacity);
                }
            });
            if(target == null) {
                var target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (structure) => {
                        return (
                                structure.structureType == STRUCTURE_EXTENSION ||
                                structure.structureType == STRUCTURE_TOWER
                            ) && structure.energy < structure.energyCapacity;
                    }
                });
            }
        }
        return target;
    };
    this.dumpRoutine = function(target, creep) {
        switch (target.structureType) {
            case STRUCTURE_EXTENSION:
            case STRUCTURE_SPAWN:
            case STRUCTURE_TOWER:
            case STRUCTURE_CONTAINER:
            case STRUCTURE_STORAGE:
                var status = creep.transfer(target, RESOURCE_ENERGY);
                switch (status) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(target);
                        break;
                    case ERR_FULL:
                    case ERR_NOT_ENOUGH_ENERGY:
                        creep.memory.target = false;
                        //We're empty, drop from idle to pick up new stuff to haul.
                        creep.memory.idle = false;
                        break;
                    case OK:
                        break;
                    default:
                        console.log('Status ' + status + ' not defined for mule.dump');
                }
                break;
            case STRUCTURE_CONTROLLER:
                if (creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
                    this.moveTo(target);
                }
                break;
        }
    };
    this.dumpAtStorage = function(creep) {
        if (creep.memory.target == false) {
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType == STRUCTURE_STORAGE &&
                        _.sum(structure.store) < structure.storeCapacity;
                }
            });
            if (target != null) {
                creep.memory.target = target.id;
            } else {
                creep.memory.target = false;
                //last resort; just return energy to the nearest container.
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return structure.structureType == STRUCTURE_CONTAINER &&
                            _.sum(structure.store) < structure.storeCapacity;
                    }
                });
                if (target != null) {
                    creep.memory.target = target.id;
                } else {
                    creep.memory.target = false;
                    creep.say('IDLE!');
                }
            }
        }
        var target = Game.getObjectById(creep.memory.target);
        if (target == null) {
            creep.memory.target = false;
        } else {
            this.dumpRoutine(target, creep);
        }
    };
    this.muleLogic = function(creep) {
        if (creep.memory.dumping && creep.carry.energy == 0) {
            creep.memory.dumping = false;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.memory.idle = false;
            creep.say('M:COL');
        }
        if (!creep.memory.dumping && !creep.memory.idle &&
            creep.carry.energy == creep.carryCapacity) {
            creep.memory.dumping = true;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.memory.idle = false;
            creep.say('M:DIST');
        }
        if (creep.memory.dumping) {
            var target = this.scanForTargets(creep);
            if (target != null) {
                creep.memory.target = target.id;
            } else {
                //nothing to mule. do secondary tasks instead.
                creep.memory.idle = true;
                creep.memory.dumping = false;
                creep.memory.target = false;
                creep.memory.source = false;
            }
            var target = Game.getObjectById(creep.memory.target);
            if (target == null) {
                creep.memory.target = false;
            } else {
                this.dumpRoutine(target, creep);
            }
        } else if(creep.memory.idle) {
            //return to duty when able
            var target = this.scanForTargets(creep);
            if(target != null) {
                creep.memory.target = target.id;
                creep.memory.idle = false;
                creep.memory.dumping = true;
            } else {
                //scan for dropped energy if we have room
                if(creep.carry.energy  < creep.carryCapacity) {
                    var target = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
                    if(target) {
                        if(creep.pickup(target) == ERR_NOT_IN_RANGE) {
                            this.moveTo(target);
                        }
                    } else {
                        //No dropped energy found, proceed to offload at Storage.
                        this.dumpAtStorage(creep);
                    }
                } else {
                    //We're full. Go dump at a Storage.
                    this.dumpAtStorage(creep);
                }
            }

        } else {
            if(creep.memory.source == false) {
                //Get energy from containers
                var source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType == STRUCTURE_CONTAINER &&
                    structure.store[RESOURCE_ENERGY] > 100
                });
                if (source != null) creep.memory.source = source.id;
            }
            if(creep.memory.source != false) {
                var source = Game.getObjectById(creep.memory.source);
                if(source instanceof Structure) { //Sources aren't structures
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
                        case OK: break;
                        default: console.log('Unhandled ERR in builder.source.container:'+status);
                    }
                } else {
                    creep.memory.source = false;
                }
            }
        }
    };
    this.run = function (creep) {
        this.creep = creep;
        if(this.renewCreep(creep)) {
            this.pickupResourcesInRange(creep);
            this.muleLogic(creep);
        }

    }
};
RoleMule.prototype = _.create(Creep.prototype, {
    'constructor': RoleMule
});
module.exports = RoleMule;