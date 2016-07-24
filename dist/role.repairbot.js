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
            if(creep.memory.target = false) {
                var target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (structure) => {
                        return structure.hits < structure.hitsMax;
                    }
                });
                if (target != null) {
                    creep.memory.target = target.id;
                }
            }
            var target = Game.getObjectById(creep.memory.target);
            if(target != null) {
                if(creep.repair(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
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