var _ = require('lodash');
var Wall = require('class.wall');
function UtilRamparts(room) {
    this.room = room;
    this.ramparts = this.getRamparts();

    this.saveToMemory = function() {
        Memory.ramparts = _.pluck(this.ramparts, 'hits');
    };
    this.getAverageStrength = function() {
        return _.round(_.sum(this.ramparts,'hits') / _.size(this.ramparts));
    };
    this.getMinimumStrength = function() {
        return _.round(_.min(this.ramparts,'hits').hits);
    };
    this.getWeakestRampart = function() {
        return _.min(this.ramparts, function(o){return o.hits;})
    };
    this.adjustStrength = function() {
        var current = Memory.config.Rampart[this.room.name].strength;
        var avg = this.getAverageStrength();
        var wall = new Wall(this.room);
        var avgWall = wall.getAverageStrength();
        //if walls are stronger than ramparts and ramparts aren't at max strength:
        if(avg < avgWall && avg < _.sample(this.ramparts).hitsMax && avg > current) {
            Memory.config.Rampart[this.room.name].strength = avg;
            console.log('Adjusting Rampart Strength for room '+ this.room.name + ' to '+avg);
        }
    }
}
UtilRamparts.prototype.getRamparts = function() {
    var r = this.room.find(FIND_MY_STRUCTURES, {
        filter: (s)=> s.structureType == STRUCTURE_RAMPART
    });
    if(Memory.config.Rampart == undefined) Memory.config.Rampart = {};
    if(Memory.config.Rampart[this.room.name] == undefined) Memory.config.Rampart[this.room.name] = {};
    if(Memory.config.Rampart[this.room.name].strength == undefined) Memory.config.Rampart[this.room.name].strength = 0;
    return r;
};
module.exports = UtilRamparts;