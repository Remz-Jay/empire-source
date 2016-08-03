var Worker = require('class.worker');
function RoleUpgrader() {
	Worker.call(this);
	this.role = 'upgrader';
	this.max = function (energyInContainers, room) {
		let num;
		if (room.controller.level > 4) {
			num = _.floor(energyInContainers / 20000);
		} else {
			num = 4;
		}
		return (num > 0) ? num : 1;
	};
	this.upgraderLogic = function () {
		if (this.creep.memory.dumping && this.creep.carry.energy == 0) {
			this.creep.memory.dumping = false;
			this.creep.memory.source = false;
			this.creep.say('U:COL');
		}
		if (!this.creep.memory.dumping && this.creep.carry.energy == this.creep.carryCapacity) {
			this.creep.memory.dumping = true;
			this.creep.memory.source = false;
			this.creep.say('U:UPGR');
		}
		if (this.creep.memory.dumping) {
			var target = this.creep.room.controller;
			if (this.creep.pos.getRangeTo(target) > 2) {
				this.moveTo(target);
				this.creep.upgradeController(target);
			} else {
				this.creep.upgradeController(target);
			}
			/**
			 if (this.creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
                this.moveTo(target);
            }
			 **/
		} else {
			this.harvestFromContainersAndSources();
		}
	};

	/** @param {Creep} creep **/
	this.run = function (creep) {
		this.creep = creep;
		if (this.renewCreep()) {
			this.pickupResourcesInRange(creep);
			this.upgraderLogic();
		}
	}
}
RoleUpgrader.prototype = _.create(Worker.prototype, {
	'constructor': RoleUpgrader
});
module.exports = RoleUpgrader;