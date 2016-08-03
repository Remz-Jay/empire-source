var Harvester = require('role.harvester');
var UtilCreep = require('util.creep');

function RoleRemoteHarvester() {
	Harvester.call(this);
	this.role = 'remoteHarvester';
	this.minRCL = 5;
	this.maxCreeps = 1;
	this.isRemote = true;
	this.targetFlag = Game.flags.Schmoop;
	this.homeFlag = Game.flags.FireBase1;
	this.max = function (energyInContainers, room) {
		return (!!room.getReservedRoom()) ? this.maxCreeps : 0;
	};
	this.getBody = function (capacity, energy, numCreeps, rcl) {
		let numParts;
		numParts = _.floor((capacity) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
		if (numParts < 1) numParts = 1;
		if (numParts > 4) numParts = 5;
		var body = [];
		for (var i = 0; i < numParts; i++) {
			body = body.concat(this.bodyPart);
		}
		return body;

	};
	this.remoteHarvesterLogic = function (creep) {
		if (!!creep.memory.dumping && creep.carry.energy == 0) {
			delete this.creep.memory.dumping;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say('H:HARV');
		}
		if (!creep.memory.dumping && creep.carry.energy == creep.carryCapacity) {
			creep.memory.dumping = true;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			this.creep.say('H:DIST');
		}
		if (!!creep.memory.dumping) {
			if (!creep.memory.target) {
				//Containers are nearby, fill them first.
				target = creep.pos.findInRange(FIND_STRUCTURES, 10, {
					filter: (structure) => {
						return structure.structureType == STRUCTURE_CONTAINER &&
							_.sum(structure.store) < structure.storeCapacity;
					}
				});

				target.length < 1 ? this.creep.say('idle!') : creep.memory.target = target[0].id;
			}
			var target = Game.getObjectById(creep.memory.target);
			if (!target) {
				delete this.creep.memory.target;
			} else {
				switch (target.structureType) {
					case STRUCTURE_EXTENSION:
					case STRUCTURE_SPAWN:
					case STRUCTURE_TOWER:
					case STRUCTURE_CONTAINER:
						var status = creep.transfer(target, RESOURCE_ENERGY);
						switch (status) {
							case ERR_NOT_IN_RANGE:
								this.moveTo(target);
								break;
							case ERR_FULL:
								delete this.creep.memory.target;
								break;
							case OK:
								break;
							default:
								console.log('Status ' + status + ' not defined for harvester.dump.spawn');
						}
						break;
					case STRUCTURE_CONTROLLER:
						if (creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
							this.moveTo(target);
						}
						break;
				}
			}
		} else {
			if (!creep.memory.source) {
				let source;
				if (creep.memory.preferredSource) {
					source = Game.getObjectById(creep.memory.preferredSource);
				} else {
					source = creep.pos.findInRange(FIND_SOURCES, 10, {
						filter: (source) => (source.energy >= 100) || source.ticksToRegeneration < 60
					});
				}
				if (source.length > 0) this.creep.memory.source = source[0].id;
			}
			if (!!creep.memory.source) {
				var source = Game.getObjectById(creep.memory.source);
				var status = creep.harvest(source);
				switch (status) {
					case ERR_NOT_ENOUGH_RESOURCES:
					case ERR_INVALID_TARGET:
						if (source.ticksToRegeneration < 60 || source.id == creep.memory.preferredSource) {
							this.moveTo(source);
							break;
						}
					case ERR_NOT_OWNER:
					case ERR_FULL:
						//Dump first before harvesting again.
						if (creep.carry.energy != 0) {
							creep.memory.dumping = true;
							delete this.creep.memory.target;
							delete this.creep.memory.source;
							this.creep.say('H:DIST');
						} else {
							delete this.creep.memory.source;
							this.creep.say('H:NEWSRC');
						}
						break;
					case ERR_NOT_IN_RANGE:
						this.moveTo(source);
						break;
					case OK:
						break;
					default:
						console.log('Unhandled ERR in builder.source.harvest:' + status);
				}
			} else {
				delete this.creep.memory.source;
			}
		}
	};
	this.run = function (creep) {
		this.creep = creep;
		if (!this.renewCreep(1500)) return;
		this.shouldIStayOrShouldIGo();
		if (undefined != this.targetFlag) {
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
				if (!this.creep.pos.isNearTo(this.targetFlag)) {
					var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
					this.moveByPath(path, this.targetFlag);
				} else {
					//see if we need to repair our container
					if (this.creep.carry.energy == this.creep.carryCapacity
						|| (this.creep.memory.dumping && this.creep.carry.energy > 0)) {
						this.creep.memory.dumping = true;
						let target = creep.pos.findInRange(FIND_STRUCTURES, 5, {
							filter: (structure) => {
								return (
									structure.hits < (structure.hitsMax * 0.9) &&
									(
										structure.structureType == STRUCTURE_CONTAINER
									)
								)
							}
						});
						if (!!target && target.length > 0) {
							target = target[0];
							var status = creep.repair(target);
							switch (status) {
								case OK:
									break;
								case ERR_BUSY:
								case ERR_INVALID_TARGET:
								case ERR_NOT_OWNER:
									delete this.creep.memory.target;
									break;
								case ERR_NOT_ENOUGH_RESOURCES:
									delete this.creep.memory.target;
									delete this.creep.memory.repairing;
									break;
								case ERR_NOT_IN_RANGE:
									this.moveTo(target);
									break;
								case ERR_NO_BODYPART:
								default:
									console.log('repairBot.repair.status: this should not happen');
							}
						} else {
							this.remoteHarvesterLogic(this.creep);
						}
					} else {
						this.remoteHarvesterLogic(this.creep);
					}
				}
			}
		}
	}
}
RoleRemoteHarvester.prototype = _.create(Harvester.prototype, {
	'constructor': RoleRemoteHarvester
});
module.exports = RoleRemoteHarvester;