var UtilCreep = require('util.creep');

function ClassCreep() {
    this.maxCreeps = 1;

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
};
module.exports = ClassCreep;