import CreepAction from "../../components/creeps/creepAction";
import WarriorGovernor from "./governors/warrior";

export interface IWFCreepAction {
	wait: boolean;
	squad: Creep[];
	squadSize: number;
	moveToTargetRoom(): void;
}

let roomCallback = function (roomName: string): CostMatrix {
	try {
		let room = Game.rooms[roomName];
		if (!room) {
			return;
		}
		return room.getCreepMatrix();
	} catch (e) {
		console.log(JSON.stringify(e), "WarfareCreepAction.roomCallback", roomName);
		return new PathFinder.CostMatrix();
	}
};

export default class WFCreepAction extends CreepAction implements IWFCreepAction {
	public squad: Creep[] = [];
	public squadSize: number = 0;
	public wait: boolean = false;
	public moveToTargetRoom(): void {
		if (!this.creep.memory.exit || !this.creep.memory.exitRoom || this.creep.memory.exitRoom === this.creep.room.name ) {
			this.nextStepIntoRoom();
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

	public getPriorityCreep(creeps: Creep[]): Creep {
		let target: Creep = undefined;
		_.reduce(creeps, function(result, value) {
			if ((value.hitsMax - value.hits) > result) {
				result = (value.hitsMax - value.hits);
				target = value;
			}
			return result;
		}, -1);
		return target;
	}

	public heal(): boolean {
		if (this.creep.hits < this.creep.hitsMax) {
			this.creep.heal(this.creep);
			return false;
		} else {
			let targets = this.creep.pos.findInRange<Creep>(FIND_MY_CREEPS, 1, {
				filter: (c: Creep) => c.hits < c.hitsMax,
			});
			if (targets.length > 0) {
				let target = this.getPriorityCreep(targets);
				this.creep.heal(target);
				return false;
			}
		}
		return true;
	}
	public attack(): boolean {
		let targets = this.creep.pos.findInRange<Creep>(FIND_HOSTILE_CREEPS, 1, {
			filter: (c: Creep) => c.hits < c.hitsMax,
		});
		if (targets.length > 0) {
			let target = this.getPriorityCreep(targets);
			this.creep.attack(target);
			return false;
		}
		return true;
	}

	public rangedAttack(): boolean {
		let targets: Creep[] = this.creep.pos.findInRange<Creep>(FIND_HOSTILE_CREEPS, 3);
		if (targets.length > 0) {
			if (targets.length > 1) {
				this.creep.rangedMassAttack();
				return false;
			} else {
				let target = this.getPriorityCreep(targets);
				this.creep.rangedAttack(target);
				return false;
			}
		}
		return true;
	}

	public rangedHeal(): boolean {
		let targets = this.creep.pos.findInRange<Creep>(FIND_MY_CREEPS, 3, {
			filter: (c: Creep) => c.hits < c.hitsMax,
		});
		if (targets.length > 0) {
			let target = this.getPriorityCreep(targets);
			this.creep.rangedHeal(target);
			return false;
		}
		return true;
	}
	public findTarget(): Creep {
		// Prioritize Hostiles with offensive capabilities.
		let hostile = this.creep.pos.findClosestByPath<Creep>(FIND_HOSTILE_CREEPS, {
			maxRooms: 1,
			costCallback: roomCallback,
			filter: (c: Creep) => c.getActiveBodyparts(ATTACK) > 0
				|| c.getActiveBodyparts(RANGED_ATTACK) > 0
				|| c.getActiveBodyparts(HEAL) > 0,
		});
		if (!!hostile) {
			return hostile;
		} else {
			// Return worker creeps instead.
			hostile = this.creep.pos.findClosestByPath<Creep>(FIND_HOSTILE_CREEPS, {
				maxRooms: 1,
				costCallback: roomCallback,
			});
			if (!!hostile) {
				return hostile;
			}
		}
		return undefined;
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
