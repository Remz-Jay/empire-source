var roleUpgrader = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.dumping && creep.carry.energy == 0) {
            creep.memory.dumping = false;
            creep.say('Harvesting');
        }
        if(!creep.memory.dumping && creep.carry.energy == creep.carryCapacity) {
            creep.memory.dumping = true;
            creep.say('Upgrading');
        }
        if(creep.memory.dumping) {
            var target = creep.room.controller;
            if (creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        } else {
            var sources = creep.room.find(FIND_SOURCES);
            if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0]);
            }
        }
    }
};

module.exports = roleUpgrader;