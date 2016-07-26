var _ = require('lodash');
var UtilCreep = function() {

};
/**
 *
 * @param {Array} body
 */
UtilCreep.calculateRequiredEnergy = function(body) {

    var cost = 0;

    _.forEach(body, function(n){
        switch (n) {
            case CARRY:
            case MOVE:
                cost += 50;
                break;
            case WORK:
                cost += 100;
                break;
            case ATTACK:
                cost += 80;
                break;
            case RANGED_ATTACK:
                cost += 150;
                break;
            case HEAL:
                cost += 250;
                break;
            case CLAIM:
                cost += 600;
                break;
            case TOUGH:
                cost += 10;
                break;
            default:
                console.log('Unknown BODY_PART: '+n);
        }
    });

    return cost;
};

module.exports = UtilCreep;