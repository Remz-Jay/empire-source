var Creep = require('class.creep');
var UtilCreep = require('util.creep');
function RoleScout() {
    Creep.call(this);
    this.role = "scout";
    this.bodyPart = [
        ATTACK,MOVE, // 80+50
        RANGED_ATTACK,MOVE, // 150+50
        HEAL,MOVE //250 +50
    ];
    this.toughPart = [TOUGH,MOVE]; //10+50
    this.targetFlag = Game.flags.Kut;
    //this.targetRoom = 'W7N42';
    this.getBody = function (capacity) {

        var numParts = _.floor(capacity / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        var body = [];
        for (var i = 0; i < numParts; i++) {
            body = body.concat(this.bodyPart);
        }
        var remainingCap = _.floor(capacity - UtilCreep.calculateRequiredEnergy(body));
        var toughParts = _.floor(remainingCap / UtilCreep.calculateRequiredEnergy([TOUGH,MOVE]));
        for (var i = 0; i < toughParts; i++) {
            body = body.concat(this.toughPart);
        }
        return body;
    };
    this.max = function(c) { return 0;};
    /** @param {Creep} creep **/
    this.run = function(creep) {
        /**
        if(creep.memory.target == false) {
            var target = creep.pos.findClosestByPath(FIND_EXIT_RIGHT);
            if(target != null) {
                creep.memory.target = target.id;
            } else {
                console.log('cannot select target');
            }
        } else {
            var target = Game.getObjectById(creep.memory.target);
            if(target != null) {
                console.log('moving to target');
                var status = creep.moveTo(target);
                console.log(status);
            } else {
                creep.memory.target = false;
            }
        }
         **/
        //TODO: The hostile logic bugs out when on a room Edge.
        var closestHostile = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: (s) => s.structureType == STRUCTURE_EXTENSION
        });
        if (closestHostile) {

            if(creep.attack(closestHostile) == ERR_NOT_IN_RANGE) {
                creep.moveTo(closestHostile);
            }
        } else {

            if (undefined != this.targetFlag) {
                if (creep.room.name != this.targetFlag.pos.roomName) {
                    var exitDir = Game.map.findExit(creep.room.name, this.targetFlag.pos.roomName);
                    var Exit = creep.pos.findClosestByPath(exitDir);
                    creep.moveTo(Exit);
                } else {
                    creep.moveTo(this.targetFlag);
                }
            }
        }
    }
}
RoleScout.prototype = _.create(Creep.prototype, {
    'constructor': RoleScout
});
module.exports = RoleScout;