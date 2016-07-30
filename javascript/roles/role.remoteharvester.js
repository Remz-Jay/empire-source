var Harvester = require('role.harvester');
function RoleRemoteHarvester() {
    Harvester.call(this);
    this.role = 'remoteHarvester';
    this.targetFlag = Game.flags.Schmoop;
    this.homeFlag = Game.flags.FireBase1;
    this.max = function(c) {return 0;}

    this.run = function(creep) {
        this.creep = creep;
        if (undefined != this.targetFlag) {
            if (this.creep.room.name != this.targetFlag.pos.roomName) {
                //pathfinder to targetFlag.
                if(!this.creep.memory.targetPath) {
                    var path = this.findPathFinderPath(this.targetFlag);
                    if(path != false) {
                        this.creep.memory.targetPath = path;
                        var log = this.creep.moveByPath(path);
                    } else {
                        creep.say('HALP!');
                    }
                } else {
                    var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
                    var log = this.creep.moveByPath(path);
                    if (log == ERR_NOT_FOUND) {
                        var path = this.findPathFinderPath(this.targetFlag);
                        if(path != false) {
                            this.creep.memory.targetPath = path;
                            var log = this.creep.moveByPath(path);
                        } else {
                            creep.say('HALP!');
                        }
                    }
                }
            } else {
                if (!this.creep.pos.isNearTo(this.targetFlag)) {
                    var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
                    var log = this.creep.moveByPath(path);
                    if (log == ERR_NOT_FOUND) {
                        var path = this.findPathFinderPath(this.targetFlag);
                        if(path != false) {
                            this.creep.memory.targetPath = path;
                            var log = this.creep.moveByPath(path);
                        } else {
                            creep.say('HALP!');
                        }
                    }
                    console.log('moving to flag');
                } else {
                    //see if we need to repair our container
                    if(this.creep.carry.energy == this.creep.carryCapacity
                        || (this.creep.memory.dumping && this.creep.carry.energy > 0)) {
                        this.creep.memory.dumping = true;
                        let target = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                            filter: (structure) => {
                                return (
                                    structure.hits < (structure.hitsMax*0.9) &&
                                    (
                                        structure.structureType == STRUCTURE_CONTAINER
                                    )
                                )
                            }
                        });
                        if(target != null && target.length > 0) {
                            target = target[0];
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
                            this.harvesterLogic(this.creep);
                        }
                    } else {
                        console.log('normal logic');
                        this.harvesterLogic(this.creep);
                    }
                }
            }
        }
    }
}
RoleRemoteHarvester.prototype = _.create(Harvester.prototype,{
    'constructor': RoleRemoteHarvester
});
module.exports = RoleRemoteHarvester;