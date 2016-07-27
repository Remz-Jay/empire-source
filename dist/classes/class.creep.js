var UtilCreep = require('util.creep');

function ClassCreep() {
    this.maxCreeps = 1;
    this.creep = false;
    this.max = function(capacity) {
        return this.maxCreeps;
    };
    /**
     *
     * @param {int} capacity
     * @returns {Array}
     */
    this.getBody = function (capacity) {
        var numParts = _.floor(capacity / UtilCreep.calculateRequiredEnergy(this.bodyPart));
        var body = [];
        for (var i = 0; i < numParts; i++) {
            body = body.concat(this.bodyPart);
        }
        return body;
    };
    /**
     * If we're on an EXIT_, make sure we do one step into the room before continuing
     * To avoid room switching.
     * Returns false if we're not on an EXIT_.
     * @returns {boolean|RoomPosition}
     */
    this.nextStepIntoRoom = function() {
        var x = this.creep.pos.x;
        var y = this.creep.pos.y;
        if (this.creep.pos.x == 0) {
            x =1;
        }
        if (this.creep.pos.x == 49) {
            x = 48;
        }
        if (this.creep.pos.y == 0) {
            y =1;
        }
        if (this.creep.pos.y == 49) {
            y = 48;
        }
        if(this.creep.pos.x == x && this.creep.pos.y == y) {
            return false;
        } else {
            return new RoomPosition(x,y,this.creep.room.name);
        }
    };
    this.harvestFromContainersAndSources = function() {
        if(this.creep.memory.source == false) {
            //Prefer energy from containers
            var source = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => structure.structureType == STRUCTURE_CONTAINER &&
                structure.store[RESOURCE_ENERGY] > 100
            });
            //Go to source otherwise
            if (source == null) {
                source = this.creep.pos.findClosestByPath(FIND_SOURCES, {
                    filter: (source) => (source.energy > 100) || source.ticksToRegeneration < 30
                });
            }
            if (source != null) this.creep.memory.source = source.id;
        }
        if(this.creep.memory.source != false) {
            var source = Game.getObjectById(this.creep.memory.source);
            if(source instanceof Structure) { //Sources aren't structures
                var status = this.creep.withdraw(source, RESOURCE_ENERGY);
                switch (status) {
                    case ERR_NOT_ENOUGH_RESOURCES:
                    case ERR_INVALID_TARGET:
                    case ERR_NOT_OWNER:
                    case ERR_FULL:
                        this.creep.memory.source = false;
                        break;
                    case ERR_NOT_IN_RANGE:
                        this.creep.moveTo(source);
                        break;
                    case OK: break;
                    default: console.log('Unhandled ERR in creep.source.container:'+status);
                }
            } else {
                var status = this.creep.harvest(source);
                switch (status) {
                    case ERR_NOT_ENOUGH_RESOURCES:
                    case ERR_INVALID_TARGET:
                    case ERR_NOT_OWNER:
                    case ERR_FULL:
                        this.creep.memory.source = false;
                        break;
                    case ERR_NOT_IN_RANGE:
                        this.creep.moveTo(source);
                        break;
                    case OK: break;
                    default: console.log('Unhandled ERR in creep.source.harvest:'+status);
                }
            }
        }
    }
};
module.exports = ClassCreep;