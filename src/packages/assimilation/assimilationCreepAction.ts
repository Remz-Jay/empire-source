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
	public passingRepair(): void {
		if (this.creep.carry.energy > 0) {
			let lookTargets = this.creep.pos.lookFor(LOOK_STRUCTURES).filter((s: Structure) => s.hits < s.hitsMax) as Structure[];
			if (lookTargets.length > 0) {
				this.creep.repair(lookTargets.shift());
			}
		}
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
