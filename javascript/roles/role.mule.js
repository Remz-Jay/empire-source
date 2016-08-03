let Creep = require('class.creep');
let UtilCreep = require('util.creep');

function RoleMule() {
	Creep.call(this);
	this.minRCL = 2;
	this.bodyPart = [CARRY, MOVE]; //50 + 50 + 100 + 100 = 300
	this.role = 'mule';
	this.maxCreeps = 2;
	this.max = function (energyInContainers, room) {
		return (room.controller.level < 3) ? 1 : this.maxCreeps;
	};
	this.getBody = function (capacity, energy, numCreeps, rcl) {
		let numParts;
		if (numCreeps > 0) {
			numParts = _.floor((capacity) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
		} else {
			numParts = _.floor((energy) / UtilCreep.calculateRequiredEnergy(this.bodyPart));
		}
		if (numParts < 1) numParts = 1;
		if (numParts > 15) numParts = 15;
		let body = [];
		for (let i = 0; i < numParts; i++) {
			body = body.concat(this.bodyPart);
		}
		return body;

	};
	this.scanForTargets = function () {
		let target = this.creep.pos.findClosestByPath(FIND_MY_SPAWNS, {
			filter: structure => structure.energy < (structure.energyCapacity / 2)
		});
		if (!target) {
			target = this.creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
				filter: structure => (
					structure.structureType == STRUCTURE_EXTENSION
					|| structure.structureType == STRUCTURE_TOWER
					|| structure.structureType == STRUCTURE_SPAWN
				) && structure.energy < structure.energyCapacity
			});
			if (!target) {
				target = this.creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
					filter: structure => (
						structure.structureType == STRUCTURE_EXTENSION
						|| structure.structureType == STRUCTURE_TOWER
					) && structure.energy < structure.energyCapacity
				});
			}
		}
		return target;
	};
	this.dumpRoutine = function (target) {
		switch (target.structureType) {
			case STRUCTURE_EXTENSION:
			case STRUCTURE_SPAWN:
			case STRUCTURE_TOWER:
			case STRUCTURE_CONTAINER:
			case STRUCTURE_STORAGE:
				let status = this.creep.transfer(target, RESOURCE_ENERGY);
				switch (status) {
					case ERR_NOT_IN_RANGE:
						if (!this.creep.memory.targetPath) {
							if (!this.findNewPath(target)) {
								this.creep.say('HALP!');
							}
						} else {
							var path = this.deserializePathFinderPath(this.creep.memory.targetPath);
							this.moveByPath(path, target);
						}
						break;
					case ERR_FULL:
					case ERR_NOT_ENOUGH_ENERGY:
						delete this.creep.memory.target;
						//We're empty, drop from idle to pick up new stuff to haul.
						delete this.creep.memory.idle;
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
			if (!!this.creep.room.storage) {
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
					let target = this.creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);
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
				} else if (!!this.creep.room.storage) {
					this.creep.memory.source = this.creep.room.storage.id;
				}
			}
			if (!!this.creep.memory.source) {
				let source = Game.getObjectById(this.creep.memory.source);
				if (source instanceof Structure) { //Sources aren't structures
					let status = this.creep.withdraw(source, RESOURCE_ENERGY, (this.creep.carryCapacity - _.sum(this.creep.carry)));
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