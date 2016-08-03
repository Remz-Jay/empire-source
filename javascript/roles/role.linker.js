var Creep = require('class.creep');
var UtilCreep = require('util.creep');
function RoleLinker() {
	Creep.call(this);
	this.role = "linker";
	this.minRCL = 5;
	this.maxCreeps = 1;
	this.bodyPart = [
		CARRY, MOVE, // 50+50
	];

	this.getBody = function (capacity, energy, numCreeps, rcl) {
		let numParts = _.floor((energy) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
		if (numParts < 1) numParts = 1;
		if (numParts > 8) numParts = 8;
		let body = [];
		for (let i = 0; i < numParts; i++) {
			body = body.concat(this.bodyPart);
		}
		return body;
	};
	/** @param {Creep} creep **/
	this.run = function (creep) {
		this.creep = creep;
		if (!this.renewCreep()) return;
		let result;
		let storage = this.creep.room.storage;
		let link = _.filter(this.creep.room.find(FIND_MY_STRUCTURES),
			s => s.structureType === STRUCTURE_LINK && s.pos.isNearTo(storage));

		if(link.length > 0) {
			link = link[0];
			if(!this.creep.pos.isNearTo(storage)) {
				this.moveTo(storage);
			} else if(!creep.pos.isNearTo(link)) {
				this.moveTo(link);
			} else {
				if (link.energy < 400) {
					this.creep.withdraw(storage, RESOURCE_ENERGY, (400 - link.energy));
					this.creep.transfer(link, RESOURCE_ENERGY);
				} else if (link.energy > 400) {
					this.creep.withdraw(link, RESOURCE_ENERGY, (link.energy - 400));
				} else {
					this.creep.transfer(storage, RESOURCE_ENERGY);
				}
			}
		}
	}
};
RoleLinker.prototype = _.create(Creep.prototype, {
	'constructor': RoleLinker
});
module.exports = RoleLinker;