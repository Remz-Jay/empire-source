var _ = require('lodash');
var Harvester = require('role.harvester');
Source.prototype.memory = undefined;

function UtilSources() {
    this.room = undefined;
    this.setRoom = function(name) {
        this.room = Game.rooms[name];
    };
    this.initMemory = function() {
        if(!this.room.memory.sources) {
            this.room.memory.sources = {};
            var c = this.room.find(FIND_SOURCES);
            _.each(c, function(s) {
                s.memory = s.room.memory.sources[s.id] = {};
            }, this);
        }
    };

    this.getSources = function() {
        this.initMemory();
        var c = this.room.find(FIND_SOURCES);
        _.each(c, function(s) {
            s.memory = s.room.memory.sources[s.id];
        }, this);
        return c;
    };

    this.findAvailableHarvester = function(s) {
        var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
        return _.find(harvesters, function(h) {
            return (!h.memory.preferedSource || h.memory.preferedSource == false) && s.room.name == h.room.name;
        });
    };

    this.updateHarvesterPreference = function() {
        _.each(this.getSources(), function(s) {
            var preferedHarvester = s.memory.preferedHarvester;
            if(!preferedHarvester || Memory.creeps[preferedHarvester] == undefined //Assigned harvester has died
            ) {
                var ph = this.findAvailableHarvester(s);
                console.log(ph);
                if(ph != undefined && ph != false) {
                    var preferedHarvester = ph.name;
                    console.log('found ' + preferedHarvester + ' for ' + s.id);
                    Game.creeps[preferedHarvester].memory.preferedSource = s.id;
                    s.memory.preferedHarvester = preferedHarvester;
                }
            }
        }, this);
    };
}
module.exports = UtilSources;