var Creep = require('class.creep');
var UtilCreep = require('util.creep');
var _ = require('lodash');
function RoleRemoteBuilder() {
    Creep.call(this);
    this.role = 'remoteBuilder';
    this.targetFlag = Game.flags.Schmoop;
    this.homeFlag = Game.flags.FireBase1;
    this.bodyPart = [CARRY, MOVE]; //50 + 50 + 100 + 100 = 300
    this.creep = false;
    this.max = function (c) {
        var sites = _.filter(Game.constructionSites, function(cs) {
            return cs.pos.roomName == this.targetFlag.pos.roomName;
        }, this);
        if(sites.length > 0) {
            return 1;
        } else {
            return 0;
        }
    };
    this.getBody = function (capacity) {
        var numParts = _.floor((capacity - 100) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        var body = [];
        for (var i = 0; i < numParts; i++) {
            body = body.concat(this.bodyPart);
        }
        return body.concat([WORK]);
    };
    this.findHomePath = function () {
        //find a suitable container
        var homeRoom = Game.rooms[this.homeFlag.pos.roomName];
        var containers = homeRoom.find(FIND_STRUCTURES, {
            filter: (s) => (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE)
            && s.store[RESOURCE_ENERGY] > this.creep.carryCapacity
        });
        console.log(containers);
        if (containers.length > 0) {
            var map = this.createPathFinderMap(containers, 1);
            var path = this.findPathFinderPath(map);
            if (path == false || path.length < 1) {
                delete this.creep.memory.homePath;
                delete this.creep.memory.homePathContainer;
            } else {
                this.creep.memory.homePath = path;
                //figure out which container we pathed to
                _.each(containers, function (c) {
                    if (_.last(path).isNearTo(c, 1)) {
                        this.creep.memory.homePathContainer = c.id;
                    }
                }, this);
            }
        }
    };
    this.run = function (creep) {
        this.creep = creep;
        if (undefined != this.targetFlag) {
            if (this.creep.room.name != this.targetFlag.pos.roomName) {
                //first make sure we fill up on energy before embarking on an adventure.
                if (this.creep.carry.energy != this.creep.carryCapacity) {
                    if (!this.creep.memory.homePath) {
                        this.harvestFromContainersAndSources();
                        this.creep.memory.runBack = true;
                    } else {
                        var c = Game.getObjectById(this.creep.memory.homePathContainer);
                        if (!this.creep.pos.isNearTo(c)) {
                            var path = this.deserializePathFinderPath(this.creep.memory.homePath);
                            var log = this.creep.moveByPath(path);
                            if (log == ERR_NOT_FOUND) {
                                this.findHomePath();
                            }
                        } else {
                            delete this.creep.memory.homePath;
                            delete this.creep.memory.homePathContainer;
                            this.harvestFromContainersAndSources();
                        }
                    }
                } else {
                    //with full energy, move to the next room.
                    //FIXME: Use a PathFinder path to the flag here instead of bolting for the exit with many many CPU cycles.
                    this.creep.memory.runBack = false;
                    var exitDir = Game.map.findExit(this.creep.room.name, this.targetFlag.pos.roomName);
                    var Exit = this.creep.pos.findClosestByPath(exitDir);
                    this.creep.moveTo(Exit);
                }
            } else {
                if (!this.creep.memory.runBack) {
                    if(!this.creep.memory.containerDone) {
                        //once we get there, move to the flag before anything else.
                        if (!this.creep.pos.isNearTo(this.targetFlag)) {
                            this.creep.moveTo(this.targetFlag);
                        } else {
                            //once we're at the flag, check if there's a container here.
                            var found = this.targetFlag.pos.lookFor(LOOK_STRUCTURES);
                            if (found.length && found[0].structureType == STRUCTURE_CONTAINER) {
                                //we have a container in place! Start finishing other jobs.
                                this.creep.memory.containerDone = true;
                            } else {
                                //Boo, no container. Are we constructing one?
                                var found = this.targetFlag.pos.lookFor(LOOK_CONSTRUCTION_SITES);
                                if (found.length && found[0].structureType == STRUCTURE_CONTAINER) {
                                    //We're already building one. Let's try and finish it.
                                    if (this.creep.build(found[0]) == ERR_NOT_ENOUGH_RESOURCES) {
                                        //We've ran out of energy. Need to head back for more. Sucks.
                                        this.creep.memory.runBack = true;
                                    }
                                } else {
                                    //No construction present. Let's start it ourselves.
                                    this.targetFlag.pos.createConstructionSite(STRUCTURE_CONTAINER);
                                }
                            }
                        }
                    } else {
                        if(creep.memory.target == false) {
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
                                //creep.moveTo(creep.pos.findClosestByPath(FIND_MY_SPAWNS));
                            }
                        }
                        var target = Game.getObjectById(creep.memory.target);
                        if(target != null) {
                            var log = creep.build(target);
                            switch(log) {
                                case OK:
                                    break;
                                case ERR_NOT_IN_RANGE:
                                    creep.moveTo(target);
                                    break;
                                case ERR_NOT_ENOUGH_RESOURCES:
                                    this.harvestFromContainersAndSources();
                                    break;
                            }
                        } else {
                            creep.memory.target = false;
                        }
                    }
                } else {
                    //Run back to mommy for more energy.
                    if (!this.creep.memory.homePath) {
                        this.findHomePath();
                    }
                    var path = this.deserializePathFinderPath(this.creep.memory.homePath);
                    var log = this.creep.moveByPath(path);
                    if (log == ERR_NOT_FOUND) {
                        this.findHomePath();
                    }
                }
            }
        }
    }
}
RoleRemoteBuilder.prototype = _.create(Creep.prototype, {
    'constructor': RoleRemoteBuilder
});
module.exports = RoleRemoteBuilder;