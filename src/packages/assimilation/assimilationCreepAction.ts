import CreepAction from "../../components/creeps/creepAction";

export interface IASMCreepAction {
}

export default class ASMCreepAction extends CreepAction implements IASMCreepAction {

	public goHome: boolean;

	public setGoHome(gh: boolean): void {
		this.goHome = gh;
	}

	public shouldIGoHome(): boolean {
		if (this.goHome) {
			this.moveTo(Game.rooms[this.creep.memory.homeRoom].minerals[0].pos);
			return true;
		} else {
			return false;
		}
	}

	public repairInfra(modifier: number = 0.3): boolean {
		if (this.creep.carry.energy > 0 ) {
			let target: Structure;
			if (!!this.creep.memory.repairtarget) {
				target = Game.getObjectById<Structure>(this.creep.memory.repairtarget);
			} else {
				let targets = this.creep.pos.findInRange<Structure>(FIND_STRUCTURES, 1, {
					filter: (s: Structure) => (
						s.structureType === STRUCTURE_ROAD
						|| s.structureType === STRUCTURE_CONTAINER
					) && s.hits < (s.hitsMax * modifier),
				});
				if (targets.length > 0) {
					this.creep.memory.repairtarget = targets[0].id;
					target = targets[0];
				} else {
					return true;
				}
			}
			let top = modifier + 0.2;
			if (top > 1.0) {
				top = 1;
			}
			if (target.hits < target.hitsMax * top) {
				let status = this.creep.repair(target);
				if (status !== OK) {
					delete this.creep.memory.repairtarget;
					return true;
				} else {
					return false;
				}
			} else {
				delete this.creep.memory.repairtarget;
				return true;
			}
		}
		return true;
	}

	public moveToTargetRoom() {
		let flag = Game.flags[this.creep.memory.config.targetRoom];
		if (!!flag && !!flag.pos) {
			this.moveTo(flag.pos);
			return;
		}
		console.log("NON FLAG MOVE");
		if (!this.creep.memory.exit || !this.creep.memory.exitRoom || this.creep.memory.exitRoom === this.creep.room.name ) {
			let index: number = 0;
			_.each(this.creep.memory.config.route, function(route: findRouteRoute, idx: number) {
				if (route.room === this.creep.room.name) {
					index = idx + 1;
				}
			}, this);
			let route = this.creep.memory.config.route[index];
			console.log(`finding route to ${index} / ${route.exit} in ${route.room}`);
			this.creep.memory.exit = this.creep.pos.findClosestByPath(route.exit, {
				costCallback: this.roomCallback,
			});
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

	public action(): boolean {
		if (!this.renewCreep() || !this.flee() || this.shouldIGoHome()) {
			return false;
		}

		this.pickupResourcesInRange();
		return true;
	}
}
