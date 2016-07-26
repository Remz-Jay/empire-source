var Creep = require('class.creep');
var UtilCreep = require('util.creep');

function RoleMule() {
    Creep.call(this);
    this.bodyPart = [CARRY, MOVE]; //50 + 50 + 100 + 100 = 300
    this.role = 'mule';
    this.maxCreeps = 2;
    this.max = function(capacity) {
        return this.maxCreeps;
    };
    this.getBody = function (capacity) {
        var numParts = _.floor((capacity-100) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        var body = [];
        for (var i = 0; i < numParts; i++) {
            body = body.concat(this.bodyPart);
        }
        return body.concat([WORK]);
    };
    this.run = function (creep) {
        if (creep.memory.dumping && creep.carry.energy == 0) {
            creep.memory.dumping = false;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.say('M:COL');
        }
        if (!creep.memory.dumping && creep.carry.energy == creep.carryCapacity) {
            creep.memory.dumping = true;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.say('M:DIST');
        }
        if (creep.memory.dumping) {
            var target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (structure) => {
                    return (
                            structure.structureType == STRUCTURE_EXTENSION ||
                            structure.structureType == STRUCTURE_SPAWN ||
                            structure.structureType == STRUCTURE_TOWER
                        ) && structure.energy < structure.energyCapacity;
                }
            });
            if (target != null) {
                creep.memory.target = target.id;
            } // TODO: what if we don't have a target?
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
                            creep.moveTo(source);
                            break;
                        case OK: break;
                        default: console.log('Unhandled ERR in builder.source.container:'+status);
                    }
                } else {
                    creep.memory.source = false;
                }
            }
        }
    }
};
RoleMule.prototype = _.create(Creep.prototype, {
    'constructor': RoleMule
});
module.exports = RoleMule;