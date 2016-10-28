interface RoomPosition {
	findClosestByPathFinder(goals: PathFinderGoal, itr: Function): PathFinderItem;
}
// TODO: Under construction
RoomPosition.prototype.findClosestByPathFinder = function(goals: PathFinderGoal, itr: Function = _.identity): PathFinderItem {
	if (_.isObject(goals)) {
		goals = _.map(goals) as PathFinderItem[];
	}
	// goals = _.map(goals, itr) as PathFinderItem[];
	let result = PathFinder.search(this, goals, {maxOps: 16000});
	let m = _.matches(_.last(result.path));
	return _.find(goals, g => m(g.pos));
};
