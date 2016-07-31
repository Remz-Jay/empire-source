var Mule = require('role.mule');
var UtilCreep = require('util.creep');

function RoleRemoteMule() {
    Mule.call(this);
    this.role = 'remoteMule';
    this.minRCL = 5;
    this.maxCreeps = 1;
    this.targetFlag = Game.flags.Schmoop;
    this.homeFlag = Game.flags.FireBase1;
    this.getBody = function (capacity, energy, numCreeps, rcl) {
        let numParts;
        numParts = _.floor((capacity-100) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        if(numParts < 1) numParts = 1;
        if(numParts > 15) numParts = 15;
        var body = [];
        for (var i = 0; i < numParts; i++) {
            body = body.concat(this.bodyPart);
        }
        return body.concat([WORK]);

    };
    this.run = function (creep) {
        this.creep = creep;
        this.shouldIStayOrShouldIGo(creep);
        this.pickupResourcesInRange(creep);
        if (creep.memory.dumping && creep.carry.energy == 0) {
            creep.memory.dumping = false;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.say('RM:COL');
        }
        if (!creep.memory.dumping  && creep.carry.energy == creep.carryCapacity) {
            creep.memory.dumping = true;
            creep.memory.target = false;
            creep.memory.source = false;
            creep.say('RM:DIST');
        }
        if (creep.memory.dumping) {
            //dump target is in home room. go there first.
            if (this.creep.room.name != this.homeFlag.pos.roomName) {
                //pathfinder to targetFlag.
                if(!this.creep.memory.targetPath) {
                    var path = this.findPathFinderPath(this.homeFlag);
                    if(path != false) {
                        this.creep.memory.targetPath = path;
                        var log = this.creep.moveByPath(path);
                    } else {
                        creep.say('HALP!');
                    }
                } else {
                    var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
                    var log = this.creep.moveByPath(path);
                }
            } else {
                this.creep.memory.targetPath = false;
                if(this.renewCreep(this.creep)) this.dumpAtStorage(creep);
            }
        } else {
            //source is in other room. go there first.
            if (this.creep.room.name != this.targetFlag.pos.roomName) {
                //pathfinder to targetFlag.
                if(!this.creep.memory.targetPath) {
                    var path = this.findPathFinderPath(this.targetFlag);
                    if(path != false) {
                        this.creep.memory.targetPath = path;
                        var log = this.creep.moveByPath(path);
                        this.creep.memory.lastPosition = this.creep.pos;
                    } else {
                        creep.say('HALP!');
                    }
                } else {
                    var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
                    var log = this.creep.moveByPath(path);
                }
            } else {
                this.creep.memory.targetPath =false;
                if (creep.memory.source == false) {
                    //Get energy from containers
                    var sources = creep.room.find(FIND_STRUCTURES, {
                        filter: (structure) => structure.structureType == STRUCTURE_CONTAINER &&
                        structure.store[RESOURCE_ENERGY] > 100
                    })
                    if (sources.length > 0) {
                        var source = _.sortBy(sources, function(s) {
                            return s.store[RESOURCE_ENERGY];
                        }).reverse()[0];
                        creep.memory.source = source.id;
                    } else {
                        //just go home. no more sources
                        this.creep.memory.dumping = true;
                        this.creep.memory.source = false;
                    }
                }
                if (creep.memory.source != false) {
                    var source = Game.getObjectById(creep.memory.source);
                    if (source instanceof Structure) { //Sources aren't structures
                        var status = creep.withdraw(source, RESOURCE_ENERGY);
                        switch (status) {
                            case ERR_NOT_ENOUGH_RESOURCES:
                                // just go home.
                                this.creep.memory.dumping = true;
                                this.creep.memory.source = false;
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
                        creep.memory.source = false;
                    }
                }
            }
        }
    }
};
RoleRemoteMule.prototype = _.create(Mule.prototype, {
    'constructor': RoleRemoteMule
});
module.exports = RoleRemoteMule;