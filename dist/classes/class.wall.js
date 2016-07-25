var _ = require('lodash');

function ClassWall(room) {
    this.room = room;
    this.walls = this.getWalls();

    this.saveToMemory = function() {
        Memory.walls = _.pluck(this.walls, 'hits');
    };
    this.getAverageStrength = function() {
        return _.round(_.sum(this.walls,'hits') / _.size(this.walls));
    };
    this.getMinimumStrength = function() {
        return _.round(_.min(this.walls,'hits').hits);
    };
    this.getWeakestWall = function() {
        return _.min(this.walls, function(o){return o.hits;})
    };
    this.adjustStrength = function() {
        var current = Memory.config.Wall.strength;
        var avg = this.getAverageStrength();
        if(avg>current) {
            Memory.config.Wall.strength = avg;
            console.log('Adjusting Wall Strength for room '+ this.room.name + ' to '+avg);
        }
    }
}
ClassWall.prototype.getWalls = function() {
    var walls = this.room.find(FIND_STRUCTURES, {
        filter: (s)=> s.structureType == STRUCTURE_WALL
    });
    return walls;
};
module.exports = ClassWall;