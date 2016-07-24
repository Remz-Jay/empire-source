var roleRepairbot = {
    body: [WORK,CARRY,CARRY,MOVE,MOVE],
    role: 'repair',
    max: 2,
    /** @param {Creep} creep **/
    run: function(creep) {

        if(creep.memory.repairing && creep.carry.energy == 0) {
            creep.memory.repairing = false;
            creep.memory.target = false;
            creep.say('Harvesting');
        }
        if(!creep.memory.repairing && creep.carry.energy == creep.carryCapacity) {
            creep.memory.repairing = true;
            creep.memory.target = false;
            creep.say('Repairing');
        }

        if(creep.memory.repairing) {
            if(creep.memory.target == false) {
                //See if any owned buildings are damaged.
                var target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.hits < structure.hitsMax);
                    }
                });
                // No? Try to repair a neutral structure instead.
                if (target == null) {
                    target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: (structure) => {
                            return (structure.hits < structure.hitsMax) &&
                                (   structure.structureType == STRUCTURE_ROAD ||
                                    structure.structureType == STRUCTURE_CONTAINER
                                )
                        }
                    });
                }
                console.log(target);
                if (target != null) {
                    creep.memory.target = target.id;
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
            var source = creep.pos.findClosestByPath(FIND_SOURCES);
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
        }
    }
};

module.exports = roleRepairbot;