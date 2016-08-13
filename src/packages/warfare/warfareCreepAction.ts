import CreepAction from "../../components/creeps/creepAction";
import WarriorGovernor from "./governors/warrior";

export interface IWFCreepAction {
	wait: boolean;
	squad: Creep[];
	squadSize: number;
	moveToTargetRoom(): void;
}

export default class WFCreepAction extends CreepAction implements IWFCreepAction {
	public squad: Creep[] = [];
	public squadSize: number = 0;
	public wait: boolean = false;
	public moveToTargetRoom(): void {
		if (!this.creep.memory.exit || !this.creep.memory.exitRoom || this.creep.memory.exitRoom === this.creep.room.name ) {
			let index: number = 0;
			_.each(this.creep.memory.config.route, function(route: findRouteRoute, idx: number) {
				if (route.room === this.creep.room.name) {
					index = idx + 1;
				}
			}, this);
			let route = this.creep.memory.config.route[index];
			console.log(`finding route to ${route.exit} in ${route.room}`);
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

	public followWarrior() {
		let w = _.find(this.squad, (c: Creep) => c.memory.role === WarriorGovernor.ROLE);
		if (!this.creep.pos.isNearTo(w)) {
			this.moveTo(w.pos);
		}
	}

	public waitAtFlag(roomName: string) {
		let flag = Game.flags[roomName];
		if (!flag) {
			console.log(`Warfare Creep waitAtFlag error: No flag for room ${roomName} found.`);
		} else {
			if (!this.creep.pos.isNearTo(flag)) {
				this.moveTo(flag.pos);
			}
		}
	}

	public action(): boolean {
		if (!this.renewCreep()) {
			return false;
		} else {
			// yeah.
		}
		return true;
	}
}
