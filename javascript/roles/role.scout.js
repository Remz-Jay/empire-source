var Creep = require('class.creep');
var UtilCreep = require('util.creep');
function RoleScout() {
	Creep.call(this);
	this.role = "scout";
	this.minRCL = 5;
	this.maxCreeps = 1;
	this.isRemote = true;
	this.maxParts = 5;
	this.maxToughParts = 4;
	this.bodyPart = [
		//ATTACK,MOVE, // 80+50
		RANGED_ATTACK, MOVE, // 150+50
		//HEAL,MOVE //250 +50
	];
	this.toughPart = [TOUGH, MOVE]; //10+50
	this.targetFlag = Game.flags.Pauper;
	//this.targetRoom = 'W7N42';
	this.max = function (energyInContainers, room) {
		return (!!room.getReservedRoomName()) ? this.maxCreeps : 0;
	};
	this.getBody = function (capacity, energy, numCreeps, rcl) {
		var numParts = _.floor((capacity - 400) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
		if(numParts < 1) numParts = 1;
		if(this.maxParts > 1 && numParts > this.maxParts) numParts = this.maxParts;
		var body = [];
		for (let i = 0; i < numParts; i++) {
			body = body.concat(this.bodyPart);
		}
		var remainingCap = _.floor((capacity - 400) - UtilCreep.calculateRequiredEnergy(body));
		var toughParts = _.floor(remainingCap / UtilCreep.calculateRequiredEnergy(this.toughPart));
		if(this.maxToughParts > 1 && toughParts > this.maxToughParts) toughParts = this.maxToughParts;
		for (let i = 0; i < toughParts; i++) {
			body = body.concat(this.toughPart);
		}
		return body;
	};
	this.moveToFlag = function () {
		if (!this.creep.memory.targetPath) {
			if (!this.findNewPath(this.targetFlag)) {
				this.creep.say('HALP!');
			}
		} else {
			var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
			this.moveByPath(path, this.targetFlag);
		}
	};
	/** @param {Creep} creep **/
	this.run = function (creep) {
		this.creep = creep;
		var emergency = false;
		var totalAnnihilation = false;
		//if(this.creep.room.find(FIND_MY_SPAWNS).length > 0) {
		if (!this.renewCreep()) return;
		//}
		//TODO: The hostile logic bugs out when on a room Edge.
		if (this.creep.memory.hasReachedFlag || emergency) {
			var targets = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
			if (targets.length > 1) {
				this.creep.rangedMassAttack();
			} else {
				var closestHostile = this.creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
				if (closestHostile) {
					if (creep.rangedAttack(closestHostile) == ERR_NOT_IN_RANGE) {
						this.creep.move(this.creep.pos.getDirectionTo(closestHostile));
					}
				} else {
					var targets = this.creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 3);
					if (targets.length > 1) {
						this.creep.rangedMassAttack();
					} else {
						var closestHostile = this.creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
							filter: (s) => s.structureType == STRUCTURE_EXTENSION
							|| s.structureType == STRUCTURE_SPAWN
							|| s.structureType == STRUCTURE_TOWER
						});
						if (closestHostile) {

							if (this.creep.rangedAttack(closestHostile) == ERR_NOT_IN_RANGE) {
								this.moveTo(closestHostile);
							}
						} else {
							if (totalAnnihilation) {
								var closestHostile = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
									filter: (s) => s.structureType == STRUCTURE_CONTAINER
									|| s.structureType == STRUCTURE_ROAD
								});
								if (closestHostile) {
									/**
									 var targets = this.creep.pos.findInRange(FIND_STRUCTURES, 3, {
                                        filter: (s) => s.structureType == STRUCTURE_CONTAINER
                                        || s.structureType == STRUCTURE_ROAD
                                    });
									 if(targets.length > 1) {
                                        this.creep.rangedMassAttack();
                                    } else {
                                    **/
									if (this.creep.rangedAttack(closestHostile) == ERR_NOT_IN_RANGE) {
										this.moveTo(closestHostile);
									}
									//}
								} else {
									this.creep.say('CHILLIN');
									if (!this.creep.pos.isNearTo(this.targetFlag)) {
										this.moveToFlag();
									}
								}
							} else {
								if (!this.creep.pos.isNearTo(this.targetFlag)) {
									this.moveToFlag();
								}
							}
						}
					}
				}
			}
		} else {
			if (undefined != this.targetFlag) {
				if (this.creep.room.find(FIND_HOSTILE_CREEPS))
					if (!this.creep.pos.isNearTo(this.targetFlag)) {
						this.moveToFlag();
					} else {
						this.creep.memory.hasReachedFlag = true;
					}
			}
		}
	}
}
RoleScout.prototype = _.create(Creep.prototype, {
	'constructor': RoleScout
});
module.exports = RoleScout;