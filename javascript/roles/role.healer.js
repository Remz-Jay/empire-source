var Creep = require('class.creep');
var UtilCreep = require('util.creep');
function RoleHealer() {
    Creep.call(this);
    this.role = "healer";
    this.minRCL = 5;
    this.bodyPart = [
        //ATTACK,MOVE, // 80+50
        HEAL,MOVE, // 150+50
        //HEAL,MOVE //250 +50
    ];
    this.toughPart = [TOUGH,MOVE]; //10+50
    this.targetFlag = Game.flags.Pauper;
    //this.targetRoom = 'W7N42';
    this.max = function(energyInContainers, room) { return 1;};
    this.getBody = function (capacity, energy, numCreeps, rcl) {
        var numParts = _.floor((capacity-400) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        var body = [];
        for (var i = 0; i < numParts; i++) {
            body = body.concat(this.bodyPart);
        }
        var remainingCap = _.floor((capacity-400) - UtilCreep.calculateRequiredEnergy(body));
        var toughParts = _.floor(remainingCap / UtilCreep.calculateRequiredEnergy([TOUGH,MOVE]));
        for (var i = 0; i < toughParts; i++) {
            body = body.concat(this.toughPart);
        }
        return body;
    };
    this.moveToFlag = function() {
        if(!this.creep.memory.targetPath) {
            var path = this.findPathFinderPath(this.targetFlag);
            if(path != false) {
                this.creep.memory.targetPath = path;
                var log = this.creep.moveByPath(path);
                if(log == ERR_NOT_FOUND){
                    this.creep.memory.targetPath = false;
                    this.moveToFlag();
                }
            } else {
                creep.say('HALP!');
            }
        } else {
            var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
            var log = this.creep.moveByPath(path);
            if(log == ERR_NOT_FOUND){
                this.creep.memory.targetPath = false;
                this.moveToFlag();
            }

        }
    }
    /** @param {Creep} creep **/
    this.run = function(creep) {
        this.creep = creep;
        var emergency = false;

        if(!this.renewCreep(this.creep)) return;
        //TODO: The hostile logic bugs out when on a room Edge.
        if(this.creep.memory.hasReachedFlag || emergency) {
            var target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: function(object) {
                    return object.hits < object.hitsMax;
                }
            });
            if(target) {
                creep.moveTo(target);
                if(creep.pos.isNearTo(target)) {
                    creep.heal(target);
                }
                else {
                    creep.rangedHeal(target);
                }
            /**
            var targets = this.creep.room.find(FIND_MY_CREEPS, {
                filter: function(c) {
                    return c.hits < c.hitsMax // && c.name != this.creep.name
                }
            });
            targets = _.sortBy(targets, function(t){
                return t.hitsMax - t.hits;
            }).reverse();
            // console.log(JSON.stringify(targets));
            if(targets.length > 0) {

                var status = this.creep.heal(targets[0]);
                switch(status) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(targets[0]);
                        break;
                    default:
                        console.log('Healer error: '+ JSON.stringify(status));
                }**/
            } else {
                if (!this.creep.pos.isNearTo(this.targetFlag)) {
                    this.moveToFlag();
                }
            }
        } else {
            if (undefined != this.targetFlag) {
                if (!this.creep.pos.isNearTo(this.targetFlag)) {
                    this.moveToFlag();
                } else {
                    this.creep.memory.hasReachedFlag = true;
                }
            }
        }
    }
}
RoleHealer.prototype = _.create(Creep.prototype, {
    'constructor': RoleHealer
});
module.exports = RoleHealer;