var Creep = require('class.creep');
function RoleClaim() {
	Creep.call(this);
	this.role = 'claim';
	this.minRCL = 5;
	this.maxCreeps = 1;
	this.maxParts = 2;
	this.targetFlag = Game.flags.Schmoop;
	this.homeFlag = Game.flags.FireBase1;
	this.bodyPart = [CLAIM, MOVE]; //600+50 = 650;
	this.username = _.get(
			_.find(Game.structures, (s) => true), 'owner.username',
			_.get(_.find(Game.creeps, (s) => true), 'owner.username')
		) || false;
	this.max = function (energyInContainers, room) {
		return (!!room.getReservedRoomName()) ? this.maxCreeps : 0;
	};
	this.run = function (creep) {
		this.creep = creep;
		if (undefined != this.targetFlag) {
			if (undefined != Game.flags.Schmoop.room) {
				let res = Game.flags.Schmoop.room.controller.reservation;
				if (this.creep.memory.switchedFlags || (!!res && res.username == this.username && res.ticksToEnd > 5000)) {
					//switch to the other room.
					this.targetFlag = Game.flags.Vagine;
					this.creep.memory.switchedFlags = true;
				}
			}
			if (this.creep.room.name != this.targetFlag.pos.roomName) {
				//pathfinder to targetFlag.
				if (!this.creep.memory.targetPath) {
					if (!this.findNewPath(this.targetFlag)) {
						this.creep.say('HALP!');
					}
				} else {
					var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
					this.moveByPath(path, this.targetFlag);
				}
			} else {
				if (!this.creep.memory.runBack) {
					delete this.creep.memory.targetPath;
					//once we get there, move to the controller.
					if (!this.creep.pos.isNearTo(creep.room.controller)) {
						this.moveTo(creep.room.controller);
					} else {
						//once we're at the controller, claim it.
						if (this.targetFlag == Game.flags.Vagine) {
							this.creep.claimController(this.creep.room.controller);
						} else {
							this.creep.reserveController(creep.room.controller);
						}
					}
				} else {
					if (!this.creep.memory.targetPath) {
						if (!this.findNewPath(this.homeFlag)) {
							this.creep.say('HALP!');
						}
					} else {
						var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
						this.moveByPath(path, this.homeFlag);
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