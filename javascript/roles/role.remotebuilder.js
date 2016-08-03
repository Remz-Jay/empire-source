var Creep = require('class.creep');
var UtilCreep = require('util.creep');
var _ = require('lodash');
function RoleRemoteBuilder() {
	Creep.call(this);
	this.role = 'remoteBuilder';
	this.minRCL = 5;
	this.isRemote = true;
	this.targetFlag = Game.flags.Vagine;
	this.homeFlag = Game.flags.FireBase1;
	this.bodyPart = [CARRY, MOVE]; //50 + 50 + 100 + 100 = 300
	this.creep = undefined;
	this.buildType = STRUCTURE_SPAWN;
	this.max = function (energyInContainers, room) {
		if (!!room.getReservedRoom()) {
			var sites = _.filter(Game.constructionSites, function (cs) {
				return cs.pos.roomName == this.targetFlag.pos.roomName;
			}, this);
			if (sites.length > 0) {
				return 2;
			} else {
				return 0;
			}
		} else {
			return 0;
		}

	};
	this.getBody = function (capacity, energy, numCreeps, rcl) {
		var numParts = _.floor((capacity - 150) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
		var body = [];
		for (var i = 0; i < numParts; i++) {
			body = body.concat(this.bodyPart);
		}
		return body.concat([WORK, MOVE]);
	};
	this.findHomePath = function () {
		//find a suitable container
		var homeRoom = Game.rooms[this.homeFlag.pos.roomName];
		var containers = homeRoom.find(FIND_STRUCTURES, {
			filter: (s) => (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE)
			&& s.store[RESOURCE_ENERGY] > this.creep.carryCapacity
		});
		if (containers.length > 0) {
			var map = this.createPathFinderMap(containers, 1);
			var path = this.findPathFinderPath(map);
			if (!path || path.length < 1) {
				delete this.creep.memory.homePath;
				delete this.creep.memory.homePathContainer;
			} else {
				this.creep.memory.homePath = path;
				//figure out which container we pathed to
				_.each(containers, function (c) {
					if (_.last(path).isNearTo(c, 1)) {
						this.creep.memory.homePathContainer = c.id;
					}
				}, this);
			}
		}
	};
	this.run = function (creep) {
		this.creep = creep;
		this.shouldIStayOrShouldIGo();
		this.pickupResourcesInRange();
		if (!!this.targetFlag) {
			if (this.creep.room.name != this.targetFlag.pos.roomName) {
				if (
					this.creep.room.name == this.homeFlag.pos.roomName
					&& !this.creep.memory.hasRenewed
				) {
					let renewStation = Game.spawns['Bastion'];
					let status = renewStation.renewCreep(this.creep);
					switch (status) {
						case ERR_NOT_IN_RANGE:
							console.log('Moving to ' + renewStation.name);
							this.moveTo(renewStation.pos);
							break;
						case OK:
							console.log('Renewed at ' + renewStation.name + '. now at ' + this.creep.ticksToLive);
							if (this.creep.ticksToLive > 1000) {
								console.log('Done renewing.');
								this.creep.memory.hasRenewed = true;
								delete this.creep.memory.touchedController;
								delete this.creep.memory.homePath;
								delete this.creep.memory.runBack;
								delete this.creep.memory.targetPath;
							}
							break;
						case ERR_NOT_ENOUGH_ENERGY:
						case ERR_BUSY:
							console.log(creep.name + ' (' + creep.memory.role + ') is waiting for renew at ' + renewStation.name + '.');
							if (creep.carry.energy > 0) {
								creep.transfer(renewStation, RESOURCE_ENERGY);
							}
							break;
						case ERR_FULL:
							this.creep.memory.hasRenewed = true;
							delete this.creep.memory.touchedController;
							delete this.creep.memory.homePath;
							delete this.creep.memory.runBack;
							delete this.creep.memory.targetPath;
							break;
						default:
							console.log('RemoteBuilder Renew Error' + JSON.stringify(status));
					}
				} else {
					//first make sure we fill up on energy before embarking on an adventure.
					if (this.creep.carry.energy != this.creep.carryCapacity) {

						if (!this.creep.memory.homePath) {
							this.harvestFromContainersAndSources();
							this.creep.memory.runBack = true;
						} else {
							var path = this.deserializePathFinderPath(this.creep.memory.homePath);
							var log = this.creep.moveByPath(path);
							if (log == ERR_NOT_FOUND) {
								this.findHomePath();
								this.creep.moveByPath(path);
							}
							var c = Game.getObjectById(this.creep.memory.homePathContainer);
							if (this.creep.pos.isNearTo(c)) {
								delete this.creep.memory.homePath;
								delete this.creep.memory.homePathContainer;
								this.harvestFromContainersAndSources();
							}
						}
					} else {
						delete this.creep.memory.runBack;
						//with full energy, move to the next room.
						if (!this.creep.memory.targetPath) {
							if (!this.findNewPath(this.targetFlag)) {
								this.creep.say('HALP!');
							}
						} else {
							var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
							this.moveByPath(path, this.targetFlag);
						}
					}
				}
			} else {
				if (!this.creep.memory.runBack) {
					if (!this.creep.memory.containerDone) {
						//No spawn yet, so we need to keep the controller from expiring.
						if (!this.creep.memory.touchedController && this.buildType == STRUCTURE_SPAWN) {
							if (this.creep.pos.getRangeTo(this.creep.room.controller) > 3) {
								this.moveTo(this.creep.room.controller);
							} else {
								if (this.creep.upgradeController(this.creep.room.controller) == OK) {
									this.creep.memory.touchedController = true;
									delete this.creep.memory.hasRenewed;
								}
							}
						} else {
							//once we get there, move to the flag before anything else.
							if (!this.creep.pos.isNearTo(this.targetFlag)) {
								this.moveTo(this.targetFlag);
							} else {
								//once we're at the flag, check if there's a container here.
								var found = this.targetFlag.pos.lookFor(LOOK_STRUCTURES);
								if (found.length && found[0].structureType == this.buildType) {
									//we have a container in place! Start finishing other jobs.
									this.creep.memory.containerDone = true;
								} else {
									//Boo, no container. Are we constructing one?
									var found = this.targetFlag.pos.lookFor(LOOK_CONSTRUCTION_SITES);
									if (found.length && found[0].structureType == this.buildType) {
										//We're already building one. Let's try and finish it.
										if (this.creep.build(found[0]) == ERR_NOT_ENOUGH_RESOURCES) {
											//We've ran out of energy. Need to head back for more. Sucks.
											this.creep.memory.runBack = true;
										}
									} else {
										//No construction present. Let's start it ourselves.
										this.targetFlag.pos.createConstructionSite(this.buildType);
									}
								}
							}
						}
					} else {
						if (!creep.memory.target) {
							var target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
							if (!!target) {
								creep.memory.target = target.id;
							} else {
								//nothing to build. return energy.
								delete this.creep.memory.building;
								creep.memory.idle = true;
								delete this.creep.memory.target;
								delete this.creep.memory.source;
								var spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
								if (creep.pos.isNearTo(spawn)) {
									if (creep.carry.energy > 0) {
										creep.transfer(spawn, RESOURCE_ENERGY);
									} else {
										spawn.recycleCreep(creep);
									}
								} else {
									creep.moveTo(spawn);
								}
								this.creep.say('B:IDLE!');
								//this.moveTo(creep.pos.findClosestByPath(FIND_MY_SPAWNS));
							}
						}
						var target = Game.getObjectById(creep.memory.target);
						if (!!target) {
							var log = creep.build(target);
							switch (log) {
								case OK:
									break;
								case ERR_NOT_IN_RANGE:
									this.moveTo(target);
									break;
								case ERR_NOT_ENOUGH_RESOURCES:
									this.harvestFromContainersAndSources();
									break;
							}
						} else {
							delete this.creep.memory.target;
						}
					}
				} else {
					//Run back to mommy for more energy.
					if (!this.creep.memory.homePath) {
						this.findHomePath();
					}
					var path = this.deserializePathFinderPath(this.creep.memory.homePath);
					var log = this.creep.moveByPath(path);
					if (log == ERR_NOT_FOUND) {
						this.findHomePath();
					}
				}
			}
		}
	}
}
RoleRemoteBuilder.prototype = _.create(Creep.prototype, {
	'constructor': RoleRemoteBuilder
});
module.exports = RoleRemoteBuilder;