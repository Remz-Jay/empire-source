var _ = require('lodash');
StructureLink.prototype.run = function () {
	var storage = this.room.storage;

	if(!!storage && this.cooldown === 0) {
		if(this.pos.isNearTo(storage)) {
			if(this.energy >= 400) {
				var receivers = _.filter(this.room.find(FIND_MY_STRUCTURES), s => s.structureType === STRUCTURE_LINK && s.id !== this.id);
				_.each(receivers, function(r) {
					if(r.energy < 300 && this.cooldown === 0) {
						this.transferEnergy(r, (400-r.energy));
					}
				}, this);
			}
		} else {
			if(this.energy >= 400) {
				var storageLink = _.filter(this.room.find(FIND_MY_STRUCTURES),
					s => s.structureType === STRUCTURE_LINK && s.pos.isNearTo(storage));
				this.transferEnergy(storageLink[0], (this.energy-400));
			}
		}
	}
};