function ClassCreep() {
    this.maxCreeps = 1;
    this.max = function(capacity) {
        return this.maxCreeps;
    }
};
module.exports = ClassCreep;