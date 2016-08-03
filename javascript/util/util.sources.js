var _ = require('lodash');
Source.prototype.memory = undefined;

function UtilSources() {
	this.room = undefined;
	this.setRoom = function (name) {
		this.room = Game.rooms[name];
	};
	this.initMemory = function () {
		if (!this.room.memory.sources) {
			this.room.memory.sources = {};
			var c = this.room.find(FIND_SOURCES);
			_.each(c, function (s) {
				s.memory = s.room.memory.sources[s.id] = {};
			}, this);
		}
	};

	this.getSources = function () {
		this.initMemory();
		var c = this.room.find(FIND_SOURCES);
		_.each(c, function (s) {
			s.memory = s.room.memory.sources[s.id];
		}, this);
		return c;
	};

	this.findAvailableHarvester = function (s) {
		var harvesters = _.filter(Game.creeps, creep => creep.memory.role == 'harvester');
		return _.find(harvesters, function (h) {
			return (!h.memory.preferredSource || h.memory.preferredSource == false) && s.room.name == h.room.name;
		});
	};

	this.updateHarvesterPreference = function () {
		_.each(this.getSources(), function (s) {
			if (!!s.memory.preferredHarvester && Memory.creeps[s.memory.preferredHarvester] == undefined //Assigned harvester has died
			) {
				var ph = this.findAvailableHarvester(s);
				if (!!ph) {
					let preferredHarvester = ph.name;
					console.log('found ' + preferredHarvester + ' for ' + s.id);
					Game.creeps[preferredHarvester].memory.preferredSource = s.id;
					s.memory.preferredHarvester = preferredHarvester;
				}
			}
		}, this);
	};
}
module.exports = UtilSources;