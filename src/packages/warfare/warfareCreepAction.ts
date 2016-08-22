import * as RoomManager from "../../components/rooms/roomManager";
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
		let room = RoomManager.getRoomByName(roomName);
		if (!room) {
			return;
		}
		let matrix = room.getCreepMatrix();
		room.allCreeps.forEach(function (creep: Creep) {
			matrix.set(creep.pos.x, creep.pos.y, 10);
		});
		for (let i = 1; i < 50; i++) {
			matrix.set(0, i, 50);
		}
		for (let i = 1; i < 50; i++) {
			matrix.set(49, i, 50);
		}
		for (let i = 1; i < 50; i++) {
			matrix.set(i, 0, 50);
		}
		for (let i = 1; i < 50; i++) {
			matrix.set(i, 49, 50);
		}
		return matrix;
	} catch (e) {
		console.log(JSON.stringify(e), "WarfareCreepAction.roomCallback", roomName);
		return new PathFinder.CostMatrix();
	}
};

export default class WFCreepAction extends CreepAction implements IWFCreepAction {
	public squad: Creep[] = [];
	public squadSize: number = 0;
	public wait: boolean = false;
	protected positions: RoomPosition[];
	protected positionIterator: number;

	public setCreep(creep: Creep, positions?: RoomPosition[]) {
		super.setCreep(creep);
		this.positions = positions;
		if (!this.creep.memory.positionIterator) {
			this.creep.memory.positionIterator = 0;
		}
		this.positionIterator = this.creep.memory.positionIterator;
	}

	public isMyRoom(roomName: string) {
		let username = _.get(
			_.find(Game.structures, (s) => true), "owner.username",
			_.get(_.find(Game.creeps, (s) => true), "owner.username")
		) as string;
		let isMyRoom = Game.rooms[roomName] &&
			Game.rooms[roomName].controller &&
			Game.rooms[roomName].controller.my;
		let isMyReservedRoom = Game.rooms[roomName] &&
			Game.rooms[roomName].controller &&
			Game.rooms[roomName].controller.reservation &&
			Game.rooms[roomName].controller.reservation.username === username;
		return (isMyRoom || isMyReservedRoom) ? true : false;
	}

	public moveUsingPositions(): boolean {
		if (!this.positions) {
			return false;
		}
		if (this.positionIterator < this.positions.length) {
			if (!this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
				this.moveTo(this.positions[this.positionIterator]);
			} else {
				this.positionIterator = ++this.creep.memory.positionIterator;
				return this.moveUsingPositions();
			}
			return true;
		}
		return false;
	}

	public moveToTargetRoom(): void {
		let flag = Game.flags[this.creep.memory.config.targetRoom];
		if (!!flag && !!flag.pos) {
			this.moveTo(flag.pos);
			return;
		}
		console.log("WARFARE NON FLAG MOVE");
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

	public getPriorityCreep(creeps: Creep[], reverse: boolean = false): Creep {
		let target: Creep = undefined;
		if (reverse) {
			_.reduce(creeps, function(result, value) {
				if ((value.hitsMax - value.hits) < result) {
					result = (value.hitsMax - value.hits);
					target = value;
				}
				return result;
			}, Infinity);
			return target;
		}
		_.reduce(creeps, function(result, value) {
			if ((value.hitsMax - value.hits) > result) {
				result = (value.hitsMax - value.hits);
				target = value;
			}
			return result;
		}, -1);
		return target;
	}

	public getPriorityStructure(structures: Structure[]): Structure {
		let target: Structure = undefined;
		_.reduce(structures, function(result, value) {
			if (value.hitsMax === 0) { // Walls in Reserved rooms have hitsMax = 0, so we have to mix it up.
				if (result === -1) {
					result = value.hits;
					target = value;
				} else if (value.hits < result) {
					result = value.hits;
					target = value;
				}
			} else if ((value.hitsMax - value.hits) > result) {
				result = (value.hitsMax - value.hits);
				target = value;
			}
			return result;
		}, -1);
		return target;
	}

	public heal(reverse: boolean = false): boolean {
		if (this.creep.hits < this.creep.hitsMax) {
			this.creep.heal(this.creep);
			return false;
		} else {
			let targets = this.creep.pos.findInRange<Creep>(FIND_MY_CREEPS, 1, {
				filter: (c: Creep) => c.hits < c.hitsMax,
			});
			if (targets.length > 0) {
				let target = this.getPriorityCreep(targets, reverse);
				this.creep.heal(target);
				return false;
			}
		}
		return true;
	}
	public attack(): boolean {
		let targets = this.creep.pos.findInRange<Creep>(FIND_HOSTILE_CREEPS, 1);
		if (targets.length > 0) {
			let target = this.getPriorityCreep(targets);
			this.creep.attack(target);
			return false;
		}
		return true;
	}

	public attackEnemyStructure(): boolean {
		let targets = this.creep.pos.findInRange<Structure>(FIND_HOSTILE_STRUCTURES, 1);
		if (targets.length > 0 ) {
			let target = this.getPriorityStructure(targets);
			this.creep.attack(target);
			return false;
		} else {
			targets = this.creep.pos.findInRange<Structure>(FIND_HOSTILE_CONSTRUCTION_SITES, 1);
			if (targets.length > 0) {
				this.creep.attack(targets[0]);
				return false;
			} else {
				return true;
			}
		}
	}

	public attackPublicStructure(): boolean {
		if (this.isMyRoom(this.creep.room.name)) {
			return true;
		}
		let targets = this.creep.pos.findInRange<Structure>(FIND_STRUCTURES, 1, {
			filter: (s: Structure) => s.structureType === STRUCTURE_WALL
				|| s.structureType === STRUCTURE_CONTAINER,
		});
		if (targets.length > 0 ) {
			let target = this.getPriorityStructure(targets);
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

	public rangedStructureAttack(): boolean {
		let targets: Structure[] = this.creep.pos.findInRange<Structure>(FIND_HOSTILE_STRUCTURES, 3);
		if (targets.length > 0) {
			if (targets.length > 1) {
				this.creep.rangedMassAttack();
				return false;
			} else {
				let target = this.getPriorityStructure(targets);
				this.creep.rangedAttack(target);
				return false;
			}
		}
		return true;
	}

	public rangedPublicStructureAttack(): boolean {
		if (this.isMyRoom(this.creep.room.name)) {
			return true;
		}
		let targets = this.creep.pos.findInRange<Structure>(FIND_STRUCTURES, 3, {
			filter: (s: Structure) => s.structureType === STRUCTURE_WALL
			|| s.structureType === STRUCTURE_CONTAINER,
		});
		if (targets.length > 0 ) {
			let target = this.getPriorityStructure(targets);
			this.creep.rangedAttack(target);
			return false;
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

	public findHealTarget(): Creep {
		let wounded = this.creep.pos.findClosestByPath<Creep>(this.creep.room.myCreeps, {
			maxRooms: 1,
			costCallback: roomCallback,
			filter: (c: Creep) => c.hits < c.hitsMax,
		});
		if (!!wounded) {
			return wounded;
		}
	}
	public findTarget(): Creep {
		// Prioritize Hostiles with offensive capabilities.
		let hostile = this.creep.pos.findClosestByPath<Creep>(this.creep.room.hostileCreeps, {
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
			hostile = this.creep.pos.findClosestByPath<Creep>(this.creep.room.hostileCreeps, {
				maxRooms: 1,
				costCallback: roomCallback,
			});
			if (!!hostile) {
				return hostile;
			}
		}
		return undefined;
	}

	public findHostileStructure(structureType: string): Structure {
		let hostile = this.creep.pos.findClosestByPath<Structure>(this.creep.room.hostileStructures, {
			maxRooms: 1,
			costCallback: roomCallback,
			filter: (c: Structure) => c.structureType === structureType,
		});
		return (!!hostile) ? hostile : undefined;
	}

	public findPublicStructure(structureType: string): Structure {
		let hostile = this.creep.pos.findClosestByPath<Structure>(this.creep.room.allStructures, {
			maxRooms: 1,
			costCallback: roomCallback,
			filter: (c: Structure) => c.structureType === structureType,
		});
		return (!!hostile) ? hostile : undefined;
	}

	public findTargetStructure(): Structure {
		let structurePriorities: string[] = [
			STRUCTURE_TOWER,
			STRUCTURE_SPAWN,
		];
		let hostile: Structure = undefined;
		structurePriorities.forEach(function(p) {
			if (!hostile) {
				hostile = this.findHostileStructure(p);
			}
		}, this);
		if (!!hostile) {
			return hostile;
		} else {
			// Any odd structure will do.
			hostile = this.creep.pos.findClosestByPath<Structure>(this.creep.room.hostileStructures, {
				maxRooms: 1,
				costCallback: roomCallback,
			});
			if (!!hostile) {
				return hostile;
			} else if (!this.isMyRoom(this.creep.room.name)) {
				structurePriorities = [
					STRUCTURE_CONTAINER,
				];
				structurePriorities.forEach(function(p) {
					if (!hostile) {
						hostile = this.findPublicStructure(p);
					}
				}, this);
				if (!!hostile) {
					return hostile;
				} else {
					hostile = this.creep.pos.findClosestByPath<Structure>(this.creep.room.allStructures, {
						filter: (s: Structure) => s.structureType === STRUCTURE_WALL
						|| s.structureType === STRUCTURE_CONTAINER,
						costCallback: this.roomCallback,
					});
				}
			}
			if (!!hostile) {
				return hostile;
			}
		}
		return undefined;
	}

	public followWarrior() {
		let w = this.squad.find((c: Creep) => c.memory.role === WarriorGovernor.ROLE);
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
