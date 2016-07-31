var Worker = require('class.worker');
var Wall = require('class.wall');

function RoleRepairbot() {
    Worker.call(this);
    this.role = 'repair';
    this.minRCL = 2;
    this.bodyPart = [CARRY, CARRY, WORK, MOVE, MOVE];
    this.myStructureMultiplier = 0.9;
    this.publicStructureMultiplier= 0.81;

    this.max = function(energyInContainers, room){
        let num;
        if(room.controller.level < 4) {
            num = 1;
        } else {
            num = _.floor(energyInContainers/30000);
        }

        return (num > 0) ? num : 0;
    };
    /** @param {Creep} creep **/
    this.run = function(creep) {
        this.creep = creep;
        this.pickupResourcesInRange(creep);
        if(this.creep.memory.repairing && this.creep.carry.energy == 0) {
            this.creep.memory.repairing = false;
            this.creep.memory.target = false;
            this.creep.memory.source = false;
            this.creep.say('R:COL');
        }
        if(!this.creep.memory.repairing && this.creep.carry.energy == this.creep.carryCapacity) {
            this.creep.memory.repairing = true;
            this.creep.memory.target = false;
            this.creep.memory.source = false;
            this.creep.say('R:REP');
        }

        if(this.creep.memory.repairing) {
            if(this.creep.memory.target == false) {
                //See if any owned buildings are damaged.
                var target = this.creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (structure) => {
                        return (
                            structure.hits < (structure.hitsMax*this.myStructureMultiplier) &&
                                structure.structureType != STRUCTURE_RAMPART
                        );
                    }
                });
                // No? Try to repair a neutral structure instead.
                if (target == null) {
                    target = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: (structure) => {
                            return (
                                structure.hits < (structure.hitsMax*this.publicStructureMultiplier) &&
                                (   structure.structureType == STRUCTURE_ROAD ||
                                    structure.structureType == STRUCTURE_CONTAINER ||
                                    structure.structureType == STRUCTURE_STORAGE
                                )
                            )
                        }
                    });
                }
                //Still nothing? Fortify Ramparts and Walls if we have spare energy.
                //if(creep.room.energyAvailable / (creep.room.energyCapacityAvailable/100)>50) {
                if(this.creep.room.energyAvailable > (this.creep.room.energyCapacityAvailable*0.8)) {
                    if (target == null) {
                        target = this.creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                            filter: (structure) => {
                                return (
                                    (
                                        structure.hits < Memory.config.Rampart.strength ||
                                        structure.hits < structure.hitsMax*0.2
                                    ) &&
                                    structure.structureType == STRUCTURE_RAMPART
                                );
                            }
                        });
                        if (target == null) {
                            var wall = new Wall(creep.room);
                            target = wall.getWeakestWall();
                        }
                    }
                }
                if (target != null) {
                    this.creep.memory.target = target.id;
                } else {
                    this.creep.moveTo(creep.pos.findClosestByPath(FIND_MY_SPAWNS));
                }
            }
            var target = Game.getObjectById(this.creep.memory.target);
            if(target != null) {
                if(target.hits == target.hitsMax) {
                    this.creep.memory.target = false;
                }
                var status = this.creep.repair(target);
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
                this.creep.memory.target = false;
            }
        } else {
            this.harvestFromContainersAndSources();
        }
    }
};
RoleRepairbot.prototype = _.create(Worker.prototype,{
    'constructor': RoleRepairbot
});
module.exports = RoleRepairbot;