var _ = require('lodash');
function UtilContainers(room) {
	this.room = room;
	this.containers = this.getContainers();
	this.containerCapacityAvailable = this.getContainerCapacityAvailable();
	this.energyInContainers = this.getEnergyInContainers();
	this.energyPercentage = this.getEnergyPercentage();
}
UtilContainers.prototype.getContainers = function () {
	var c = this.room.find(FIND_STRUCTURES, {
		filter: (s)=> s.structureType == STRUCTURE_CONTAINER
		|| s.structureType == STRUCTURE_STORAGE
	});
	return c;
};
UtilContainers.prototype.getContainerCapacityAvailable = function () {
	var total = 0;
	_.each(this.containers, function (c) {
		total += c.storeCapacity;
	});
	return total;
};
UtilContainers.prototype.getEnergyInContainers = function () {
	var total = 0;
	_.each(this.containers, function (c) {
		total += c.store[RESOURCE_ENERGY];
	});
	return total;
};
UtilContainers.prototype.getEnergyPercentage = function () {
	return _.floor(this.energyInContainers / (this.containerCapacityAvailable / 100));
};
module.exports = UtilContainers;