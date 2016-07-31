var Creep = require('class.creep');
var UtilCreep = require('util.creep');
function RoleScout() {
    Creep.call(this);
    this.role = "scout";
    this.minRCL = 5;
    this.bodyPart = [
        //ATTACK,MOVE, // 80+50
        RANGED_ATTACK,MOVE, // 150+50
        //HEAL,MOVE //250 +50
    ];
    this.toughPart = [TOUGH,MOVE]; //10+50
    this.targetFlag = Game.flags.Pauper;
    //this.targetRoom = 'W7N42';
    this.max = function(energyInContainers, room) { return 2;};
    this.getBody = function (capacity, energy, numCreeps, rcl) {
        var numParts = _.floor((capacity-400) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        var body = [];
        for (var i = 0; i < numParts; i++) {
            body = body.concat(this.bodyPart);
        }
        var remainingCap = _.floor((capacity-400) - UtilCreep.calculateRequiredEnergy(body));
        var toughParts = _.floor(remainingCap / UtilCreep.calculateRequiredEnergy([TOUGH,MOVE]));
        for (var i = 0; i < toughParts; i++) {
            body = body.concat(this.toughPart);
        }
        return body;
    };
    this.moveToFlag = function() {
        if(!this.creep.memory.targetPath) {
            var path = this.findPathFinderPath(this.targetFlag);
            if(path != false) {
                this.creep.memory.targetPath = path;
                var log = this.creep.moveByPath(path);
                if(log == ERR_NOT_FOUND){
                    this.creep.memory.targetPath = false;
                    this.moveToFlag();
                }
            } else {
                this.creep.say('HALP!');
            }
        } else {
            var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
            var log = this.creep.moveByPath(path);
            if(log == ERR_NOT_FOUND){
                this.creep.memory.targetPath = false;
                this.moveToFlag();
            }

        }
    }
    /** @param {Creep} creep **/
    this.run = function(creep) {
        this.creep = creep;
        var emergency = false
        var totalAnihalation = false;
        //if(this.creep.room.find(FIND_MY_SPAWNS).length > 0) {
        if(!this.renewCreep(this.creep)) return;
        //}
        //TODO: The hostile logic bugs out when on a room Edge.
        if(this.creep.memory.hasReachedFlag || emergency) {
            var targets = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
            if(targets.length > 1) {
                this.creep.rangedMassAttack();
            } else {
                var closestHostile = this.creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                if (closestHostile) {
                    if (creep.rangedAttack(closestHostile) == ERR_NOT_IN_RANGE) {
                        this.creep.move(this.creep.pos.getDirectionTo(closestHostile));
                    }
                } else {
                    var targets = this.creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 3);
                    if(targets.length > 1) {
                        this.creep.rangedMassAttack();
                    } else {
                        var closestHostile = this.creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
                            filter: (s) => s.structureType == STRUCTURE_EXTENSION
                            || s.structureType == STRUCTURE_SPAWN
                            || s.structureType == STRUCTURE_TOWER
                        });
                        if (closestHostile) {

                            if (this.creep.rangedAttack(closestHostile) == ERR_NOT_IN_RANGE) {
                                this.moveTo(closestHostile);
                            }
                        } else {
                            if (totalAnihalation) {
                                var closestHostile = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
                                    filter: (s) => s.structureType == STRUCTURE_CONTAINER
                                    || s.structureType == STRUCTURE_ROAD
                                });
                                if (closestHostile) {
                                    /**
                                     var targets = this.creep.pos.findInRange(FIND_STRUCTURES, 3, {
                                        filter: (s) => s.structureType == STRUCTURE_CONTAINER
                                        || s.structureType == STRUCTURE_ROAD
                                    });
                                     if(targets.length > 1) {
                                        this.creep.rangedMassAttack();
                                    } else {
                                    **/
                                    if (this.creep.rangedAttack(closestHostile) == ERR_NOT_IN_RANGE) {
                                        this.moveTo(closestHostile);
                                    }
                                    //}
                                } else {
                                    this.creep.say('CHILLIN');
                                    if (!this.creep.pos.isNearTo(this.targetFlag)) {
                                        this.moveToFlag();
                                    }
                                }
                            } else {
                                if (!this.creep.pos.isNearTo(this.targetFlag)) {
                                    this.moveToFlag();
                                }
                            }
                        }
                    }
                }
            }
        } else {
            if (undefined != this.targetFlag) {
                if(this.creep.room.find(FIND_HOSTILE_CREEPS))
                if (!this.creep.pos.isNearTo(this.targetFlag)) {
                    this.moveToFlag();
                } else {
                    this.creep.memory.hasReachedFlag = true;
                }
            }
        }
    }
}
RoleScout.prototype = _.create(Creep.prototype, {
    'constructor': RoleScout
});
module.exports = RoleScout;