var Creep = require('class.creep');
function RoleClaim() {
	Creep.call(this);
	this.role = 'claim';
	this.minRCL = 5;
	this.targetFlag = Game.flags.Schmoop;
	this.homeFlag = Game.flags.FireBase1;
	this.bodyPart = [CLAIM, MOVE]; //600+50 = 650;
	this.max = function (energyInContainers, room) {
		return 1;
	}
	this.run = function (creep) {
		this.creep = creep;
		if (undefined != this.targetFlag) {
			if (undefined != Game.flags.Schmoop.room) {
				let res = Game.flags.Schmoop.room.controller.reservation;
				if (this.creep.memory.switchedFlags || (res && res.username == "Remco" && res.ticksToEnd > 5000)) {
					//switch to the other room.
					this.targetFlag = Game.flags.Vagine;
					this.creep.memory.switchedFlags = true;
				}
			}
			if (this.creep.room.name != this.targetFlag.pos.roomName) {
				//pathfinder to targetFlag.
				if (!this.creep.memory.targetPath) {
					var path = this.findPathFinderPath(this.targetFlag);
					if (path != false) {
						this.creep.memory.targetPath = path;
						var log = this.creep.moveByPath(path);
					} else {
						creep.say('HALP!');
					}
				} else {
					var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
					var log = this.creep.moveByPath(path);
					if (log == ERR_NOT_FOUND) {
						var path = this.findPathFinderPath(this.targetFlag);
						if (path != false) {
							this.creep.memory.targetPath = path;
							var log = this.creep.moveByPath(path);
						} else {
							creep.say('HALP!');
						}
					}
				}
			} else {
				if (!this.creep.memory.runBack) {
					delete this.creep.memory.targetPath;
					//once we get there, move to the controller.
					if (!this.creep.pos.isNearTo(creep.room.controller)) {
						this.moveTo(creep.room.controller);
					} else {
						//once we're at the controller, claim it.
						let res = this.creep.room.controller.reservation;
						if (this.targetFlag == Game.flags.Vagine) {
							this.creep.claimController(this.creep.room.controller);
						} else {
							this.creep.reserveController(creep.room.controller);
						}
					}
				} else {
					if (!this.creep.memory.targetPath) {
						var path = this.findPathFinderPath(this.homeFlag);
						if (path != false) {
							this.creep.memory.targetPath = path;
							var log = this.creep.moveByPath(path);
						} else {
							creep.say('HALP!');
						}
					} else {
						var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
						var log = this.creep.moveByPath(path);
					}
				}
			}
		}
	}
}
RoleClaim.prototype = _.create(Creep.prototype, {
	'constructor': RoleClaim
});
module.exports = RoleClaim;