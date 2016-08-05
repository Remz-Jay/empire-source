let Creep = require('class.creep');
let UtilCreep = require('util.creep');

function RoleMule() {
	Creep.call(this);
	this.minRCL = 2;
	this.bodyPart = [CARRY, MOVE]; //50 + 50 + 100 + 100 = 300
	this.role = 'mule';
	this.maxParts = 15;
	this.maxCreeps = 2;
	this.max = function (energyInContainers, room) {
		if ((room.energyInContainers + room.energyAvailable)  < (room.energyCapacityAvailable*0.8)) {
			this.emergency = true;
			this.maxCreeps = 3;
		}
		return (room.controller.level < 3) ? 1 : this.maxCreeps;
	};
	this.getBody = function (capacity, energy, numCreeps, rcl) {
		let numParts;
		if (numCreeps > 0 && !this.emergency) {
			numParts = _.floor((capacity) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
		} else {
			numParts = _.floor((energy) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
		}
		if(numParts < 3) numParts = 3;
		if(this.maxParts > 3 && numParts > this.maxParts) numParts = this.maxParts;
		let body = [];
		for (let i = 0; i < numParts; i++) {
			body = body.concat(this.bodyPart);
		}
		return body;

	};
	this.scanForTargets = function (blackList = []) {
		var target = this.creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
			filter: structure => ( blackList.indexOf(structure.id) == -1 &&
				(
					(structure.structureType == STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity)
				|| ((structure.structureType == STRUCTURE_TOWER || structure.structureType == STRUCTURE_SPAWN) && structure.energy < (structure.energyCapacity * 0.8))
				)
			)
		});
		//return target;
		if(!!target) {
			let taken = this.creep.room.find(FIND_MY_CREEPS, {
				filter: c => c.name != this.creep.name
					&& c.memory.role == this.creep.memory.role
					&& (!!c.memory.target && c.memory.target == target.id)

			});
			if(!!taken && taken.length > 0) {
				blackList.push(target.id);
				return this.scanForTargets(blackList);
			} else {
				return target;
			}
		} else {
			return undefined;
		}
	};
	this.dumpRoutine = function (target) {
		switch (target.structureType) {
			case STRUCTURE_EXTENSION:
			case STRUCTURE_SPAWN:
			case STRUCTURE_TOWER:
			case STRUCTURE_CONTAINER:
			case STRUCTURE_STORAGE:
			case STRUCTURE_LINK:
				let status = this.creep.transfer(target, RESOURCE_ENERGY);
				switch (status) {
					case ERR_NOT_IN_RANGE:
						if(!!this.creep.memory.target && this.creep.memory.target == target.id && !!this.creep.memory.targetPath) {
							var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
							this.moveByPath(path, target);
						} else {
							this.creep.memory.target = target.id;
							delete this.creep.memory.targetPath;
							if (!this.findNewPath(target)) {
								this.creep.say('HALP!');
							}
						}
						break;
					case ERR_FULL:
					case ERR_NOT_ENOUGH_ENERGY:
						delete this.creep.memory.target;
						delete this.creep.memory.targetPath;
						//We're empty, drop from idle to pick up new stuff to haul.
						delete this.creep.memory.idle;
						this.muleLogic();
						break;
					case OK:
						delete this.creep.memory.targetPath;
						break;
					default:
						console.log('Status ' + status + ' not defined for mule.dump');
				}
				break;
			case STRUCTURE_CONTROLLER:
				if (this.creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
					this.moveTo(target);
				}
				break;
		}
	};
	this.dumpAtStorage = function () {
		if (!this.creep.memory.target) {
			//find a nearby link first, if storage isn't close
			if(!!this.creep.room.storage && this.creep.pos.getRangeTo(this.creep.room.storage) > 9) {
				let target = this.creep.pos.findInRange(FIND_STRUCTURES, 10, {
					filter: s => s.structureType == STRUCTURE_LINK
					&& s.energy < s.energyCapacity
				});
				if(!!target && target.length > 0) {
					this.creep.memory.target = target[0].id;
				} else {
					this.creep.memory.target = this.creep.room.storage.id;
				}
			} else if(!!this.creep.room.storage) {
				this.creep.memory.target = this.creep.room.storage.id;
			} else {
				//last resort; just return energy to the nearest container.
				let target = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: structure => structure.structureType == STRUCTURE_CONTAINER
					&& _.sum(structure.store) < structure.storeCapacity
				});
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					delete this.creep.memory.target;
					this.creep.say('IDLE!');
				}
			}
		}
		let target = Game.getObjectById(this.creep.memory.target);
		if (!target) {
			delete this.creep.memory.target;
		} else {
			this.dumpRoutine(target);
		}
	};
	this.muleLogic = function () {
		if (!!this.creep.memory.dumping && this.creep.carry.energy == 0) {
			delete this.creep.memory.dumping;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.idle;
			this.creep.say('M:COL');
		}
		if (!this.creep.memory.dumping && !this.creep.memory.idle &&
			this.creep.carry.energy == this.creep.carryCapacity) {
			this.creep.memory.dumping = true;
			delete this.creep.memory.target;
			delete this.creep.memory.source;
			delete this.creep.memory.idle;
			this.creep.say('M:DIST');
		}
		if (!!this.creep.memory.dumping) {
			if (!this.creep.memory.target) {
				let target = this.scanForTargets();
				if (!!target) {
					this.creep.memory.target = target.id;
				} else {
					//nothing to mule. do secondary tasks instead.
					this.creep.memory.idle = true;
					delete this.creep.memory.dumping;
					delete this.creep.memory.target;
					delete this.creep.memory.source;
				}
			}
			let target = Game.getObjectById(this.creep.memory.target);
			if (!target) {
				delete this.creep.memory.target;
			} else {

				this.dumpRoutine(target);
			}
		} else if (!!this.creep.memory.idle) {
			//return to duty when able
			let target = this.scanForTargets();
			if (!!target) {
				this.creep.memory.target = target.id;
				delete this.creep.memory.idle;
				this.creep.memory.dumping = true;
			} else {
				//scan for dropped energy if we have room
				if (this.creep.carry.energy < this.creep.carryCapacity) {

					let target = this.creep.pos.findClosestByPath(FIND_DROPPED_ENERGY, {maxRooms: 1});
					if (!!target) {
						if (this.creep.pickup(target) == ERR_NOT_IN_RANGE) {
							this.moveTo(target);
						}
					} else {

						//No dropped energy found, proceed to offload at Storage.
						this.dumpAtStorage();
					}
				} else {
					//We're full. Go dump at a Storage.
					this.dumpAtStorage();
				}
			}

		} else {
			if (!this.creep.memory.source) {
				//Get energy from containers
				let source = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure) => structure.structureType == STRUCTURE_CONTAINER &&
					structure.store[RESOURCE_ENERGY] > 100
				});
				if (!!source) {
					this.creep.memory.source = source.id;
				} else if (!!this.creep.room.storage && this.creep.room.storage.store[RESOURCE_ENERGY] > 0) {
					this.creep.memory.source = this.creep.room.storage.id;
				}
			}
			if (!!this.creep.memory.source) {
				let source = Game.getObjectById(this.creep.memory.source);
				if (source instanceof Structure) { //Sources aren't structures
					let status = this.creep.withdraw(source, RESOURCE_ENERGY);
					switch (status) {
						case ERR_NOT_ENOUGH_RESOURCES:
						case ERR_INVALID_TARGET:
						case ERR_NOT_OWNER:
						case ERR_FULL:
							delete this.creep.memory.source;
							break;
						case ERR_NOT_IN_RANGE:
							this.moveTo(source);
							break;
						case OK:
							break;
						default:
							console.log('Unhandled ERR in builder.source.container:' + status);
					}
				} else {
					delete this.creep.memory.source;
				}
			} else {
				// no more sources. start dumping
				if(this.creep.carry.energy > 0) {
					this.creep.memory.dumping = true;
				} else {
					this.creep.say('DRY');
				}
			}
		}
	};
	this.run = function (creep) {
		this.creep = creep;
		if (!this.renewCreep()) return;
		this.pickupResourcesInRange();
		this.muleLogic();
	}
}
RoleMule.prototype = _.create(Creep.prototype, {
	'constructor': RoleMule
});
module.exports = RoleMule;