import CreepAction from "../../components/creeps/creepAction";

export interface IASMCreepAction {
}

export default class ASMCreepAction extends CreepAction implements IASMCreepAction {

	public repairInfra(modifier: number = 0.8): boolean {
		if (this.creep.carry.energy > 0 ) {
			let targets = this.creep.pos.findInRange<Structure>(FIND_STRUCTURES, 1, {
				filter: (s: Structure) => (
					s.structureType === STRUCTURE_ROAD
					|| s.structureType === STRUCTURE_CONTAINER
				) && s.hits < (s.hitsMax * modifier),
			});
			if (targets.length > 0) {
				this.creep.repair(targets[0]);
				return false;
			}
		}
		return true;
	}

	public moveToTargetRoom() {
/*		let flag = Game.flags[this.creep.memory.targetRoom];
		if (!!flag) {
			let path = this.findPathFinderPath(this.createPathFinderMap([flag.pos]));
			if (!!path) {
				this.moveByPath(path, flag);
				return;
			}
		}*/
		if (!this.creep.memory.exit || !this.creep.memory.exitRoom || this.creep.memory.exitRoom === this.creep.room.name ) {
			let index: number = 0;
			_.each(this.creep.memory.config.route, function(route: findRouteRoute, idx: number) {
				if (route.room === this.creep.room.name) {
					index = idx + 1;
				}
			}, this);
			let route = this.creep.memory.config.route[index];
			console.log(`finding route to ${index} / ${route.exit} in ${route.room}`);
			this.creep.memory.exit = this.creep.pos.findClosestByPath(route.exit);
			this.creep.memory.exitRoom = route.room;
		} else {
			if (!!this.creep.memory.exit && !!this.creep.memory.exitPath) {
				let path = this.deserializePathFinderPath(this.creep.memory.exitPath);
				this.moveByPath(path, this.creep.memory.exit, "exitPath");
			} else {
				delete this.creep.memory.exitPath;
				let path = this.findPathFinderPath(this.creep.memory.exit);
				if (!!path) {
					this.creep.memory.exitPath = path;
					this.moveByPath(path, this.creep.memory.exit, "exitPath");
				}
			}
		}
	}

	public flee(): boolean {
		let targets = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 10);
		if (targets.length > 0) {
			let goals = _.map(targets, function(t: Creep) { return {pos: t.pos, range: 7}; });
			let path = PathFinder.search(this.creep.pos, goals, {flee: true, maxRooms: 2});
			this.creep.moveByPath(path.path);
			this.creep.say("FLEE!");
			return false;
		}
		return true;
	}

	public action(): boolean {
		if (!this.renewCreep() || !this.flee()) {
			return false;
		}
		this.pickupResourcesInRange();
		return true;
	}
}
