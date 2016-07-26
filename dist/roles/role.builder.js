var Worker = require('class.worker');
var _ = require('lodash');

function RoleBuilder() {
    Worker.call(this);
    this.role = 'builder';

    this.max = function(capacity) {
        var sites = Object.keys(Game.constructionSites).length;
        if(sites > 0) {
            if(sites > 8) {
                return 4;
            } else {
                return _.ceil(sites/2);
            }
        } else return 0;
    };
    /** @param {Creep} creep **/
    this.run = function(creep) {

        if(creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.say('B:COL');
        }
        if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
            creep.memory.building = true;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.say('B:BUILD');
        }

        if(creep.memory.building) {
            if(creep.memory.target == false) {
                var target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
                if (target != null) {
                    creep.memory.target = target.id;
                } else {
                    creep.moveTo(creep.pos.findClosestByPath(FIND_MY_SPAWNS));
                }
            }
            var target = Game.getObjectById(creep.memory.target);
            if(target != null) {
                if(creep.build(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
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
                        default: console.log('Unhandled ERR in builder.source.container:'+status);
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
                        default: console.log('Unhandled ERR in builder.source.harvest:'+status);
                    }
                }
            }
        }
    }
};
RoleBuilder.prototype = _.create(Worker.prototype,{
    'constructor': RoleBuilder
});
module.exports = RoleBuilder;