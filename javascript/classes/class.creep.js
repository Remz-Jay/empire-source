var UtilCreep = require('util.creep');
var _ = require('lodash');
var UtilRoom = require('util.room');

let roomManager = new UtilRoom();

function ClassCreep() {
    this.maxCreeps = 1;
    this.minRCL = 1;
    this.creep = false;
    this.max = function(capacity) {
        return this.maxCreeps;
    };
    /**
     *
     * @param {int} capacity
     * @returns {Array}
     */
    this.getBody = function (capacity, energy, numCreeps, rcl) {
        var numParts = _.floor(capacity / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        var body = [];
        for (var i = 0; i < numParts; i++) {
            body = body.concat(this.bodyPart);
        }
        return body;
    };
    this.expireCreep = function(creep) {
        //see if an upgrade for this creep is available
        if(undefined != creep.memory.homeRoom && undefined != creep.memory.homeSpawn) {
            try {
                let room = Game.rooms[creep.memory.homeRoom];
                let spawn = Game.spawns[creep.memory.homeSpawn];
                var x = _.filter(Game.creeps, (c) => c.memory.role == creep.memory.role
                    && ( c.memory.homeRoom != undefined
                        && c.memory.homeRoom == room.name
                    ) && ( c.memory.homeSpawn != undefined
                        && c.memory.homeSpawn == spawn.name
                    )
                );
                var body = this.getBody(room.energyCapacityAvailable, room.energyAvailable, x.length, room.controller.level);
                if( UtilCreep.calculateRequiredEnergy(body) > UtilCreep.calculateRequiredEnergy(_.pluck(creep.body, 'type'))) {
                    console.log('Expiring creep '+creep.name+' ('+creep.memory.role+') in room '+room.name+' for an upgrade.');
                    return true;
                }
            } catch (e) {
                console.log(JSON.stringify(e), 'Creep.renewCreep.ExpireCreep');
            }

        }
        return false;
    };
    this.renewCreep = function(creep, max = 1000) {
        if(creep.ticksToLive < 250) {
            creep.memory.hasRenewed = false;
        }
        if(creep.memory.hasRenewed != undefined && !creep.memory.hasRenewed) {
            var spawns = creep.room.find(FIND_MY_SPAWNS);
            let renewStation;
            if(spawns.length > 0) {
                //if(spawns.length > 0 && creep.room.controller.level > 1 && UtilCreep.calculateRequiredEnergy(_.pluck(creep.body, 'type')) < creep.room.energyCapacityAvailable){
                renewStation = spawns[0];
                //} else {
                //    renewStation = (undefined == creep.memory.homeSpawn) ? Game.spawns['Bastion'] : Game.spawns[creep.memory.homeSpawn];
                //}
            } else {
                renewStation = (undefined == creep.memory.homeSpawn) ? Game.spawns['Bastion'] : Game.spawns[creep.memory.homeSpawn];
            }
            let status;
            let phrase;
            if(this.expireCreep(creep)) {
                status = renewStation.recycleCreep(creep);
                phrase = 'demolition.'
            } else {
                status = renewStation.renewCreep(creep);
                phrase = 'renew.'
            }
            switch (status) {
                case ERR_NOT_IN_RANGE:
                    console.log(creep.name + ' ('+creep.memory.role+') is moving to ' + renewStation.name + ' for ' + phrase);
                    if (!creep.memory.renewPath) {
                        var path = this.findPathFinderPath({pos: renewStation.pos, range: 1});
                        if (path == false || path.length < 1) {
                            delete creep.memory.renewPath;
                        } else {
                            creep.memory.renewPath = path;
                        }
                    }
                    var path = this.deserializePathFinderPath(this.creep.memory.renewPath);
                    var log = creep.moveByPath(path);
                    if(creep.memory.previousPosition) {
                        var prev = creep.memory.previousPosition;
                        if(prev.x == creep.pos.x && prev.y == creep.pos.y) {
                            console.log(creep.name + 'hasnt moved this turn.');
                        }
                        creep.memory.previousPosition = {x: creep.pos.x, y: creep.pos.y, roomName: creep.pos.roomName};
                    }
                    if (log == ERR_NOT_FOUND) {
                        var path = this.findPathFinderPath({pos: renewStation.pos, range: 1});
                        if (path == false || path.length < 1) {
                            delete creep.memory.renewPath;
                        } else {
                            creep.memory.renewPath = path;
                        }
                    }
                    //creep.moveTo(renewStation.pos);
                    break;
                case OK:
                    console.log(creep.name + ' ('+creep.memory.role+') renewed at ' + renewStation.name + '. now at ' + creep.ticksToLive);
                    if (creep.ticksToLive > max) {
                        console.log('Done renewing.');
                        creep.memory.hasRenewed = true;
                        delete creep.memory.renewPath;
                    }
                    break;
                case ERR_FULL:
                    creep.memory.hasRenewed = true;
                    delete creep.memory.renewPath;
                    break;
                case ERR_BUSY:
                case ERR_NOT_ENOUGH_ENERGY:
                    console.log(creep.name + ' ('+creep.memory.role+') is waiting for renew at ' + renewStation.name + '.');
                    if(creep.carry.energy > 0) {
                        creep.transfer(renewStation, RESOURCE_ENERGY);
                    }
                    break;
                default:
                    console.log('Uncatched Creep Renew Error' + JSON.stringify(status));
            }
            return false;
        } else {
            return true;
        }

    }
    this.pickupResourcesInRange = function(creep) {
        if(_.sum(creep.carry)<creep.carryCapacity) {
            let targets = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
            if(targets.length>0) {
                _.each(targets, function(t) {
                    if(_.sum(creep.carry)<creep.carryCapacity) {
                        creep.pickup(t);
                    }
                }, this);
            }
            targets = creep.pos.findInRange(FIND_STRUCTURES,1, {
                filter: (s) => {
                    return s.structureType == STRUCTURE_CONTAINER
                        && s.store[RESOURCE_ENERGY] > 0;
                }
            });
            if(targets.length > 0) {
                _.each(targets, function(t) {
                    if(_.sum(creep.carry)<creep.carryCapacity) {
                        creep.withdraw(t, RESOURCE_ENERGY);
                    }
                }, this);
            }
        }
    };
    let roomCallback = function (roomName) {
        try {
            let room = Game.rooms[roomName];
            if (!room) {
                return;
            }
            return roomManager.getCreepMatrixForRoom(roomName);
        } catch (e) {
            console.log(JSON.stringify(e), "Class.Creep.roomCallback", roomName);
            return new PathFinder.CostMatrix();
        }

    };

    this.moveTo = function (target) {
        this.creep.moveTo(target);
        return;
        try {
            let path = PathFinder.search(this.creep.pos, {pos: target.pos, range: 1}, {
                plainCost: 2,
                swampCost: 10,
                roomCallback: roomCallback,
            });

            let pos = path.path[0];
            let status = this.creep.move(this.creep.pos.getDirectionTo(pos));
            return status;
        } catch (e) {
            console.log(JSON.stringify(e), "Class.Creep.moveTo");
            //fall back to regular move.
            this.creep.moveTo(target);
        }
    };
    /**
     * If we're on an EXIT_, make sure we do one step into the room before continuing
     * To avoid room switching.
     * Returns false if we're not on an EXIT_.
     * @returns {boolean|RoomPosition}
     */
    this.nextStepIntoRoom = function(creep) {
        var x = this.creep.pos.x;
        var y = this.creep.pos.y;
        if (this.creep.pos.x == 0) {
            x =48;
            creep.move(RIGHT);
        }
        if (this.creep.pos.x == 49) {
            x = 1;
            creep.move(LEFT);
        }
        if (this.creep.pos.y == 0) {
            y =48;
            creep.move(BOTTOM);
        }
        if (this.creep.pos.y == 49) {
            y = 1;
            creep.move(TOP);
        }
        if(this.creep.pos.x == x && this.creep.pos.y == y) {
            return false;
        } else {
            return new RoomPosition(x,y,this.creep.room.name);
        }
    };
    this.createPathFinderMap = function(goals, range = 1) {
        return _.map(goals, function (source) {
            // We can't actually walk on sources-- set `range` to 1 so we path
            // next to it.
            return {pos: source.pos, range: range};
        });
    };
    this.deserializePathFinderPath = function (p) {
        var path = [];
        _.each(p, function (x) {
            path.push(new RoomPosition(x.x, x.y, x.roomName));
        }, this);
        return path;
    };

    this.findPathFinderPath = function (goal) {
        var path = PathFinder.search(this.creep.pos, goal, {
            // We need to set the defaults costs higher so that we
            // can set the road cost lower in `roomCallback`
            plainCost: 2,
            swampCost: 10,

            roomCallback: function (roomName) {

                let room = Game.rooms[roomName];
                // In this example `room` will always exist, but since PathFinder
                // supports searches which span multiple rooms you should be careful!
                if (!room) return;
                let costs = new PathFinder.CostMatrix;

                room.find(FIND_STRUCTURES).forEach(function (structure) {
                    if (structure.structureType === STRUCTURE_ROAD) {
                        // Favor roads over plain tiles
                        costs.set(structure.pos.x, structure.pos.y, 1);
                    } else if (structure.structureType !== STRUCTURE_CONTAINER &&
                        (structure.structureType !== STRUCTURE_RAMPART || !structure.my)) {
                        // Can't walk through non-walkable buildings
                        costs.set(structure.pos.x, structure.pos.y, 0xff);
                    }
                });

                // Avoid creeps in the room
                room.find(FIND_CREEPS).forEach(function (creep) {
                    costs.set(creep.pos.x, creep.pos.y, 0xff);
                });

                return costs;
            },
        });
        if (path.path.length < 1) {
            //We're near the target.
            return false;
        } else {
            return path.path;
        }
    };
    this.shouldIStayOrShouldIGo = function (creep) {
        if(!this.creep.memory.fleePath) {
            let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
            if(hostiles > 0) {
                creep.say('FTHISIMOUT');
                creep.memory.flee = true;
                var path = this.findPathFinderPath(this.homeFlag);
                if(path != false) {
                    this.creep.memory.fleePath = path;
                    var log = this.creep.moveByPath(path);
                } else {
                    creep.say('HALP!');
                }
            }
        } else {
            if (this.creep.pos.isNearTo(this.homeFlag)) {
                //We've made it home. See if the coast is clear again.
                let hostiles = this.targetFlag.room.find(FIND_HOSTILE_CREEPS);
                if(hostiles == 0) {
                    delete this.memory.flee;
                    delete this.memory.fleePath;
                }
            } else {
                var path = this.deserializePathFinderPath(this.creep.memory.fleePath);
                var log = this.creep.moveByPath(path);
            }

        }

    }
    this.harvestFromContainersAndSources = function() {
        if(this.creep.memory.source == false) {
            //Prefer energy from containers
            var source = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => (
                    structure.structureType == STRUCTURE_CONTAINER ||
                    structure.structureType == STRUCTURE_STORAGE
                ) && structure.store[RESOURCE_ENERGY] > 100
            });
            //Go to source otherwise
            if (source == null) {
                source = this.creep.pos.findClosestByPath(FIND_MY_SPAWNS, function(s) {
                    return structure.energy > 0 && structure.room.name == this.creep.room.name
                    }, this
                );
                if (source == null) {
                    source = this.creep.pos.findClosestByPath(FIND_SOURCES, {
                        filter: (source) => (source.energy > 100) || source.ticksToRegeneration < 30
                    });
                }

            }
            if (source != null) this.creep.memory.source = source.id;
        }
        if(this.creep.memory.source != false) {
            var source = Game.getObjectById(this.creep.memory.source);
            if(source instanceof Structure) { //Sources aren't structures
                var status = this.creep.withdraw(source, RESOURCE_ENERGY);
                switch (status) {
                    case ERR_NOT_ENOUGH_RESOURCES:
                    case ERR_INVALID_TARGET:
                    case ERR_NOT_OWNER:
                    case ERR_FULL:
                        this.creep.memory.source = false;
                        break;
                    case ERR_NOT_IN_RANGE:
                        this.creep.moveTo(source);
                        break;
                    case OK: break;
                    default: console.log('Unhandled ERR in creep.source.container:'+status);
                }
            } else {
                var status = this.creep.harvest(source);
                switch (status) {
                    case ERR_NOT_ENOUGH_RESOURCES:
                    case ERR_INVALID_TARGET:
                    case ERR_NOT_OWNER:
                    case ERR_FULL:
                        this.creep.memory.source = false;
                        break;
                    case ERR_NOT_IN_RANGE:
                        this.creep.moveTo(source);
                        break;
                    case OK: break;
                    default: console.log('Unhandled ERR in creep.source.harvest:'+status);
                }
            }
        }
    }
};
module.exports = ClassCreep;