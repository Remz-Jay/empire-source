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
                //first make sure we fill up on energy before embarking on an adventure.
                if(this.creep.carry.energy != this.creep.carryCapacity) {
                    //dirty fix to get out of map exit.
                    if(this.nextStepIntoRoom()!=false) {
                        this.creep.moveTo(this.nextStepIntoRoom());
                    } else {
                        this.harvestFromContainersAndSources();
                        this.creep.memory.runBack = true;
                    }
                } else {
                    //with full energy, move to the next room.
                    this.creep.memory.runBack = false;
                    var exitDir = Game.map.findExit(this.creep.room.name, this.targetFlag.pos.roomName);
                    var Exit = this.creep.pos.findClosestByPath(exitDir);
                    this.creep.moveTo(Exit);
                }
            } else {
                if(!this.creep.memory.runBack) {
                    //once we get there, move to the flag before anything else.
                    if(!this.creep.pos.isNearTo(this.targetFlag)) {
                        this.creep.moveTo(this.targetFlag);
                    } else {
                        //once we're at the flag, check if there's a container here.
                        var found = this.targetFlag.pos.lookFor(LOOK_STRUCTURES);
                        if(found.length && found[0].structureType == STRUCTURE_CONTAINER) {
                            //we have a container in place! Start harvesting.
                            //TODO: Implement harvesting.
                            Harvester.prototype.run.call(this);
                        } else {
                            //Boo, no container. Are we constructing one?
                            var found = this.targetFlag.pos.lookFor(LOOK_CONSTRUCTION_SITES);
                            if(found.length && found[0].structureType == STRUCTURE_CONTAINER) {
                                //We're already building one. Let's try and finish it.
                                if(this.creep.build(found[0]) == ERR_NOT_ENOUGH_RESOURCES) {
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
                    var exitDir = Game.map.findExit(this.creep.room.name, this.homeFlag.pos.roomName);
                    var Exit = this.creep.pos.findClosestByPath(exitDir);
                    this.creep.moveTo(Exit);
                }
            }
        }
    }
}
RoleRemoteHarvester.prototype = _.create(Harvester.prototype,{
    'constructor': RoleRemoteHarvester
});
module.exports = RoleRemoteHarvester;