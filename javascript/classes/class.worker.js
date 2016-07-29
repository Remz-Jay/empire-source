var Creep = require('class.creep');

function ClassWorker() {
    Creep.call(this);
    this.bodyPart = [CARRY, MOVE, WORK, WORK]; //50 + 50 + 100 + 100 = 300
};

ClassWorker.prototype = _.create(Creep.prototype, {
    'constructor': ClassWorker
});
module.exports = ClassWorker;