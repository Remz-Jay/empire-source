var roleHarvester = {
    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.dumping && creep.carry.energy == 0) {
            creep.memory.dumping = false;
            creep.memory.target  = false;
            creep.say('harvesting');
        }
        if(!creep.memory.dumping && creep.carry.energy == creep.carryCapacity) {
            creep.memory.dumping = true;
            creep.memory.target = false;
            creep.say('Dumping Energy');
        }
        if(creep.memory.dumping) {
            if(creep.memory.target == false) {
                var targets = creep.room.find(FIND_STRUCTURES, {
                            filter: (structure) => {
                            return (structure.structureType == STRUCTURE_EXTENSION ||
                        structure.structureType == STRUCTURE_SPAWN ||
                        structure.structureType == STRUCTURE_TOWER) && structure.energy < structure.energyCapacity;
            }
            });
                if (targets.length > 0) {
                    creep.memory.target = targets[0].id;
                } else {
                    creep.memory.target = creep.room.controller.id;
                }
            }
            var target = Game.getObjectById(creep.memory.target);
            if (target == null) {
                creep.memory.target = false;
            } else {
                switch(target.structureType) {
                    case 'spawn':
                        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(target);
                        }
                        break;
                    case 'controller':
                        if (creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(target);
                        }
                        break;
                }
            }
        } else {
            var source = creep.pos.findClosestByPath(FIND_SOURCES);
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
        }
    }
};

module.exports = roleHarvester;