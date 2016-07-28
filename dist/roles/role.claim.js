var Creep = require('class.creep');
function RoleClaim() {
    Creep.call(this);
    this.role = 'claim';
    this.targetFlag = Game.flags.Schmoop;
    this.homeFlag = Game.flags.FireBase1;
    this.bodyPart = [CLAIM, MOVE]; //600+50 = 650;
    this.max = function(c) {return 1;}
    this.run = function(creep) {
        this.creep = creep;
        if (undefined != this.targetFlag) {
            if (this.creep.room.name != this.targetFlag.pos.roomName) {
                //with full energy, move to the next room.
                //FIXME: Use PathFinder here.
                this.creep.memory.runBack = false;
                var exitDir = Game.map.findExit(this.creep.room.name, this.targetFlag.pos.roomName);
                var Exit = this.creep.pos.findClosestByPath(exitDir);
                this.creep.moveTo(Exit);
            } else {
                if(!this.creep.memory.runBack) {
                    //once we get there, move to the controller.
                    if(!this.creep.pos.isNearTo(creep.room.controller)) {
                        this.creep.moveTo(creep.room.controller);
                    } else {
                        //once we're at the controller, claim it.
                        this.creep.reserveController(creep.room.controller);
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
RoleClaim.prototype = _.create(Creep.prototype,{
    'constructor': RoleClaim
});
module.exports = RoleClaim;