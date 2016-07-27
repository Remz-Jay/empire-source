var Worker = require('class.worker');
function RoleUpgrader() {
    Worker.call(this);
    this.role = 'upgrader';
    this.max = function(containerPercentage){
        if(containerPercentage >= 90) {
            return 3;
        } else if(containerPercentage >= 50) {
            return 2;
        } else {
            return 1;
        }
    };

    /** @param {Creep} creep **/
    this.run = function(creep) {
        this.creep = creep;
        if(this.creep.memory.dumping && this.creep.carry.energy == 0) {
            this.creep.memory.dumping = false;
            this.creep.memory.source = false;
            this.creep.say('U:COL');
        }
        if(!this.creep.memory.dumping && this.creep.carry.energy == this.creep.carryCapacity) {
            this.creep.memory.dumping = true;
            this.creep.memory.source = false;
            this.creep.say('U:UPGR');
        }
        if(this.creep.memory.dumping) {
            var target = this.creep.room.controller;
            if (this.creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
                this.creep.moveTo(target);
            }
        } else {
           this.harvestFromContainersAndSources();
        }
    }
};
RoleUpgrader.prototype = _.create(Worker.prototype,{
    'constructor': RoleUpgrader
});
module.exports = RoleUpgrader;