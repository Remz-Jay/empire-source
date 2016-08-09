var _ = require('lodash');
var UtilCreep = function () {

};
/**
 *
 * @param {Array} body
 */
UtilCreep.calculateRequiredEnergy = function (body) {

	var cost = 0;

	_.forEach(body, function (n) {
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
				console.log('Unknown BODY_PART: ' + n);
		}
	});

	return cost;
};

UtilCreep.sortBodyParts = function(bodyParts) {
	return _.sortBy(bodyParts, function (part) {
		switch (part) {
			case TOUGH:
				return 1;
				break;
			case CARRY:
				return 2;
				break;
			case MOVE:
				return 5;
				break;
			case CLAIM:
				return 80;
				break;
			case HEAL:
				return 90;
				break;
			case ATTACK:
				return 95;
				break;
			case RANGED_ATTACK:
				return 100;
				break;
			default:
				return 10;
		}
	});
};

module.exports = UtilCreep;