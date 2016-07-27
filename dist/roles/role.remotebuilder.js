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
        return 1;
    }
    this.getBody = function (capacity) {
        var numParts = _.floor((capacity - 100) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        var body = [];
        for (var i = 0; i < numParts; i++) {
            body = body.concat(this.bodyPart);
        }
        return body.concat([WORK]);
    };
    this.deserializePathFinderPath = function(p) {
        var path = [];
        _.each(p, function(x) {
            path.push(new RoomPosition(x.x, x.y, x.roomName));
        }, this);
        return path;
    }
    this.findHomePath = function() {
        //find a suitable container
        var homeRoom = Game.rooms[this.homeFlag.pos.roomName];
        var containers = homeRoom.find(FIND_STRUCTURES, {
            filter: (s) => (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE)
            && s.store[RESOURCE_ENERGY] > this.creep.carryCapacity
        });
        console.log(containers);
        if(containers.length > 0) {
            var path = PathFinder.search(this.creep.pos, _.map(containers, function(source) {
                // We can't actually walk on sources-- set `range` to 1 so we path
                // next to it.
                return {pos: source.pos, range: 1};
            }),     {
                // We need to set the defaults costs higher so that we
                // can set the road cost lower in `roomCallback`
                plainCost: 2,
                swampCost: 10,

                roomCallback: function(roomName) {

                    let room = Game.rooms[roomName];
                    // In this example `room` will always exist, but since PathFinder
                    // supports searches which span multiple rooms you should be careful!
                    if (!room) return;
                    let costs = new PathFinder.CostMatrix;

                    room.find(FIND_STRUCTURES).forEach(function(structure) {
                        if (structure.structureType === STRUCTURE_ROAD) {
                            // Favor roads over plain tiles
                            costs.set(structure.pos.x, structure.pos.y, 1);
                        } else if (structure.structureType !== STRUCTURE_CONTAINER &&
                            (structure.structureType !== STRUCTURE_RAMPART ||
                            !structure.my)) {
                            // Can't walk through non-walkable buildings
                            costs.set(structure.pos.x, structure.pos.y, 0xff);
                        }
                    });

                    // Avoid creeps in the room
                    room.find(FIND_CREEPS).forEach(function(creep) {
                        costs.set(creep.pos.x, creep.pos.y, 0xff);
                    });

                    return costs;
                },
            });
            if(path.path.length < 1) {
                delete this.creep.memory.homePath;
                delete this.creep.memory.homePathContainer;
            } else {
                this.creep.memory.homePath = path.path;
                //figure out which container we pathed to
                _.each(containers, function (c) {
                    if (_.last(path.path).isNearTo(c, 1)) {
                        this.creep.memory.homePathContainer = c.id;
                    }
                });
            }
        }
    };
    this.run = function (creep) {
        this.creep = creep;
        if (undefined != this.targetFlag) {
            if (this.creep.room.name != this.targetFlag.pos.roomName) {
                //first make sure we fill up on energy before embarking on an adventure.
                if (this.creep.carry.energy != this.creep.carryCapacity) {
                    //dirty fix to get out of map exit.
                    if (this.nextStepIntoRoom(this.creep) != false) {
                        //this.creep.moveTo(this.nextStepIntoRoom());
                    } else {
                        if(!this.creep.memory.homePath) {
                            this.harvestFromContainersAndSources();
                            this.creep.memory.runBack = true;
                        } else {
                            var c = Game.getObjectById(this.creep.memory.homePathContainer);
                            if(!this.creep.pos.isNearTo(c)) {
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

                    }
                } else {
                    //with full energy, move to the next room.
                    this.creep.memory.runBack = false;
                    var exitDir = Game.map.findExit(this.creep.room.name, this.targetFlag.pos.roomName);
                    var Exit = this.creep.pos.findClosestByPath(exitDir);
                    this.creep.moveTo(Exit);
                }
            } else {
                if (!this.creep.memory.runBack) {
                    //once we get there, move to the flag before anything else.
                    if (!this.creep.pos.isNearTo(this.targetFlag)) {
                        this.creep.moveTo(this.targetFlag);
                    } else {
                        //once we're at the flag, check if there's a container here.
                        var found = this.targetFlag.pos.lookFor(LOOK_STRUCTURES);
                        if (found.length && found[0].structureType == STRUCTURE_CONTAINER) {
                            //we have a container in place! Start harvesting.
                            creep.say('READY!');
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
                    //Run back to mommy for more energy.
                    if(!this.creep.memory.homePath) {
                       this.findHomePath();
                    }
                    var path = this.deserializePathFinderPath(this.creep.memory.homePath);
                    var log = this.creep.moveByPath(path);
                    if (log == ERR_NOT_FOUND) {
                        this.findHomePath();
                    }
                    /**
                    var exitDir = Game.map.findExit(this.creep.room.name, this.homeFlag.pos.roomName);
                    var Exit = this.creep.pos.findClosestByPath(exitDir);
                    this.creep.moveTo(Exit);
                     **/
                }
            }
        }
    }
}
RoleRemoteBuilder.prototype = _.create(Creep.prototype, {
    'constructor': RoleRemoteBuilder
});
module.exports = RoleRemoteBuilder;