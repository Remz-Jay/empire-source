var Creep = require('class.creep');
function RoleRepairbot() {
    Creep.call(this);
    this.body = [WORK,CARRY,CARRY,MOVE,MOVE];
    this.getBody = function(capacity) {
        var body = this.body;
        if (capacity >= 400) {
            body = [WORK,WORK,CARRY,CARRY,MOVE,MOVE]; //400
        }
        return body;
    };
    this.role = 'repair';
    this.wallStrength = 30000;
    this.rampartMultiplier = 0.3;
    this.myStructureMultiplier = 0.8;
    this.publicStructureMultiplier= 0.7;
    this.max = function(capacity){ return 2; };
    /** @param {Creep} creep **/
    this.run = function(creep) {

        if(creep.memory.repairing && creep.carry.energy == 0) {
            creep.memory.repairing = false;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.say('Harvesting');
        }
        if(!creep.memory.repairing && creep.carry.energy == creep.carryCapacity) {
            creep.memory.repairing = true;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.say('Repairing');
        }

        if(creep.memory.repairing) {
            if(creep.memory.target == false) {
                //See if any owned buildings are damaged.
                var target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (structure) => {
                        return (
                            structure.hits < (structure.hitsMax*this.myStructureMultiplier) &&
                                structure.structureType != STRUCTURE_RAMPART
                        );
                    }
                });
                // No? Try to repair a neutral structure instead.
                if (target == null) {
                    target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: (structure) => {
                            return (
                                structure.hits < (structure.hitsMax*this.publicStructureMultiplier) &&
                                (   structure.structureType == STRUCTURE_ROAD ||
                                    structure.structureType == STRUCTURE_CONTAINER
                                )
                            )
                        }
                    });
                }
                //Still nothing? Fortify Ramparts and Walls.
                if (target == null) {
                    target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                        filter: (structure) => {
                            return (
                                structure.hits < (structure.hitsMax*this.rampartMultiplier) &&
                                structure.structureType == STRUCTURE_RAMPART
                            );
                        }
                    });
                    if (target == null) {
                        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                            filter: (structure) => {
                                return (
                                    //structure.hits < (structure.hitsMax*0.001) &&
                                    structure.hits < this.wallStrength &&
                                    structure.structureType == STRUCTURE_WALL                                );
                            }
                        });
                    }
                }
                if (target != null) {
                    creep.memory.target = target.id;
                } else {
                    creep.moveTo(creep.pos.findClosestByPath(FIND_MY_SPAWNS));
                }
            }
            var target = Game.getObjectById(creep.memory.target);
            if(target != null) {
                if(target.hits == target.hitsMax) {
                    creep.memory.target = false;
                }
                var status = creep.repair(target);
                switch(status) {
                    case OK:
                        break;
                    case ERR_BUSY:
                    case ERR_INVALID_TARGET:
                    case ERR_NOT_OWNER:
                        creep.memory.target = false;
                        break;
                    case ERR_NOT_ENOUGH_RESOURCES:
                        creep.memory.target = false;
                        creep.memory.repairing = false;
                        break;
                    case ERR_NOT_IN_RANGE:
                        creep.moveTo(target);
                        break;
                    case ERR_NO_BODYPART:
                    default:
                        console.log('repairBot.repair.status: this should not happen');
                }
            } else {
                creep.memory.target = false;
            }
        } else {
            if(creep.memory.source == false) {
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
                            creep.moveTo(source);
                            break;
                        case OK: break;
                        default: console.log('Unhandled ERR in harvester.source.container:'+status);
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
                            creep.moveTo(source);
                            break;
                        case OK: break;
                        default: console.log('Unhandled ERR in harvester.source.harvest:'+status);
                    }
                }
            }
        }
    }
};
RoleRepairbot.prototype = _.create(Creep.prototype,{
    'constructor': RoleRepairbot
});
module.exports = RoleRepairbot;