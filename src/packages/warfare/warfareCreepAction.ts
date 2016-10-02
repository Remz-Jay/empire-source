import CreepAction from "../../components/creeps/creepAction";
import WarriorGovernor from "./governors/warrior";

export interface IWFCreepAction {
	wait: boolean;
	squad: Creep[];
	squadSize: number;
	checkTough(): boolean;
	moveToHeal(): boolean;
	moveToSafeRange(): boolean;
	moveToTargetRoom(): void;
	moveUsingPositions(): boolean;
}

export default class WFCreepAction extends CreepAction implements IWFCreepAction {
	public squad: Creep[] = [];
	public squadSize: number = 0;
	public wait: boolean = false;
	public ignoreStructures: string[] = [
		// STRUCTURE_STORAGE,
		// STRUCTURE_TERMINAL,
		// STRUCTURE_SPAWN,
		// STRUCTURE_EXTENSION,
	];
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

	public checkTough(): boolean {
		return (this.creep.getActiveBodyparts(TOUGH) > 0);
	}

	public moveToHeal(): boolean {
		if (!this.checkTough() || this.creep.memory.waitForHealth) {
			this.creep.memory.waitForHealth = true;
			this.creep.memory.positionIterator = this.positionIterator = 0;
			if (!this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
				this.moveTo(this.positions[this.positionIterator]);
			}
			return false;
		}
		return true;
	}

	public moveToSafeRange(): boolean {
		const targets = this.creep.pos.findInRange(this.creep.room.hostileCreeps, 2, {
			filter: (c: Creep) => c.getActiveBodyparts(ATTACK) > 0
			|| c.getActiveBodyparts(RANGED_ATTACK) > 0,
		});
		if (targets.length > 0) {
			const goals = _.map(targets, function (t: Creep) {
				return {pos: t.pos, range: 3};
			});
			const path = PathFinder.search(this.creep.pos, goals, {
				flee: true,
				maxRooms: 1,
				plainCost: 2,
				swampCost: 10,
				maxOps: 500,
				roomCallback: this.creepCallback,
			});
			const pos = path.path[0];
			this.creep.move(this.creep.pos.getDirectionTo(pos));
			return false;
		}
		return true;
	}

	public isMyRoom(roomName: string) {
		const username = _.get(
			_.find(Game.structures, (s) => true), "owner.username",
			_.get(_.find(Game.creeps, (s) => true), "owner.username")
		) as string;
		const isMyRoom = Game.rooms[roomName] &&
			Game.rooms[roomName].controller &&
			Game.rooms[roomName].controller.my;
		const isMyReservedRoom = Game.rooms[roomName] &&
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
			const friendlies = _.union(this.creep.room.myCreeps, this.creep.room.alliedCreeps);
			if (friendlies.length > 1) { // Is it just me up in here?
				const targets = friendlies.filter(
					(c: Creep) => c.hits < c.hitsMax && c.pos.isNearTo(this.creep));
				if (targets.length > 0) {
					const target = this.getPriorityCreep(targets, reverse);
					this.creep.heal(target);
					return false;
				}
			}
		}
		return true;
	}
	public attack(): boolean {
		if (this.creep.room.hostileCreeps.length > 0) {
			const targets = this.creep.room.hostileCreeps.filter((c: Creep) => c.pos.isNearTo(this.creep));
			if (targets.length > 0) {
				const target = this.getPriorityCreep(targets);
				this.creep.attack(target);
				return false;
			}
		}
		return true;
	}

	public attackEnemyStructure(): boolean {
		if (this.creep.room.hostileStructures.length > 0) {
			const targets: Structure[]  = this.creep.room.hostileStructures.filter(
				(s: Structure) => !_.includes(this.ignoreStructures, s.structureType) && s.pos.isNearTo(this.creep)
			);
			if (targets.length > 0 ) {
				const target = this.getPriorityStructure(targets);
				this.creep.attack(target);
				return false;
			}
		}
		return true;
	}

	public attackPublicStructure(): boolean {
		if (this.isMyRoom(this.creep.room.name)) {
			return true;
		}
		if (this.creep.room.allStructures.length > 0) {
			const targets = this.creep.room.allStructures.filter((s: Structure) =>
				(s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_CONTAINER)
				&& s.pos.isNearTo(this.creep)
			);
			if (targets.length > 0 ) {
				const target = this.getPriorityStructure(targets);
				this.creep.attack(target);
				return false;
			}
		}
		return true;
	}
	public rangedAttack(doMass: boolean = true): boolean {
		if (this.creep.room.hostileCreeps.length > 0) {
			const targets: Creep[] = this.creep.room.hostileCreeps.filter((c: Creep) => c.pos.inRangeTo(this.creep.pos, 3));
			if (targets.length > 0) {
				if (doMass && targets.length > 1) {
					this.creep.rangedMassAttack();
					return false;
				} else {
					const target = this.getPriorityCreep(targets);
					this.creep.rangedAttack(target);
					return false;
				}
			}
		}
		return true;
	}

	public rangedStructureAttack(doMass: boolean = true): boolean {
		if (this.creep.room.hostileStructures.length > 0) {
			const targets: Structure[] = this.creep.room.hostileStructures.filter(
				(s: Structure) => !_.includes(this.ignoreStructures, s.structureType) && s.pos.inRangeTo(this.creep.pos, 3)
			);
			if (targets.length > 0) {
				if (doMass && targets.length > 1) {
					this.creep.rangedMassAttack();
					return false;
				} else {
					const target = this.getPriorityStructure(targets);
					this.creep.rangedAttack(target);
					return false;
				}
			}
		}
		return true;
	}

	public rangedPublicStructureAttack(): boolean {
		if (this.isMyRoom(this.creep.room.name) || !this.creep.room.controller) {
			return true;
		}
		if (this.creep.room.allStructures.length > 0) {
			const targets = this.creep.room.allStructures.filter(
				(s: Structure) => (s.structureType === STRUCTURE_ROAD || s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_CONTAINER)
				&& s.pos.inRangeTo(this.creep.pos, 3)
			);
			if (targets.length > 0 ) {
				const target = this.getPriorityStructure(targets);
				this.creep.rangedAttack(target);
				return false;
			}
		}
		return true;
	}

	public rangedHeal(): boolean {
		const friendlies = _.union(this.creep.room.myCreeps, this.creep.room.alliedCreeps);
		if (friendlies.length > 1) { // Is it just me up in here?
			const targets = friendlies.filter((c: Creep) => c.hits < c.hitsMax && c.pos.inRangeTo(this.creep.pos, 3));
			if (targets.length > 0) {
				const target = this.getPriorityCreep(targets);
				this.creep.rangedHeal(target);
				return false;
			}
		}
		return true;
	}

	public findHealTarget(): Creep {
		if (this.creep.room.myCreeps.length > 1) {
			const wounded = this.creep.pos.findClosestByRange<Creep>(this.creep.room.myCreeps, {
				filter: (c: Creep) => c.hits < c.hitsMax,
			});
			if (!!wounded) {
				return wounded;
			}
		}
		return undefined;
	}
	public findTarget(): Creep {
		if (this.creep.room.hostileCreeps.length > 0) {
			// Prioritize Hostiles with offensive capabilities.
			const hostiles = this.creep.room.hostileCreeps.filter((c: Creep) =>
				c.getActiveBodyparts(ATTACK) > 0
				|| c.getActiveBodyparts(RANGED_ATTACK) > 0
				|| c.getActiveBodyparts(HEAL) > 0
			);
			let hostile = this.creep.pos.findClosestByRange<Creep>(hostiles);
			if (!!hostile) {
				if (hostile.owner.username === "Source Keeper" && hostile.pos.findInRange(this.creep.room.sources, 5).length === 0) {
					return undefined;
				} else {
					return hostile;
				}
			} else {
				// Return worker creeps instead.
				hostile = this.creep.pos.findClosestByRange<Creep>(this.creep.room.hostileCreeps);
				if (!!hostile) {
					return hostile;
				}
			}
		}
		return undefined;
	}

	public findHostileStructure(structureType: string): Structure {
		if (this.creep.room.hostileStructures.length > 0) {
			const hostiles = this.creep.room.hostileStructures.filter((c: Structure) => c.structureType === structureType);
			const hostile = this.creep.pos.findClosestByRange<Structure>(hostiles);
			return (!!hostile) ? hostile : undefined;
		}
		return undefined;
	}

	public findPublicStructure(structureType: string): Structure {
		if (this.creep.room.allStructures.length > 0) {
			const hostiles = this.creep.room.allStructures.filter((c: Structure) => c.structureType === structureType);
			const hostile = this.creep.pos.findClosestByRange<Structure>(hostiles);
			return (!!hostile) ? hostile : undefined;
		}
		return undefined;
	}

	public findTargetStructure(): Structure {
		let structurePriorities: string[] = [
			STRUCTURE_TOWER,
			// STRUCTURE_SPAWN,
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
			hostile = this.creep.pos.findClosestByRange<Structure>(this.creep.room.hostileStructures,
				{filter: (s: Structure) => !_.includes(this.ignoreStructures, s.structureType) }
			);
			if (!!hostile) {
				return hostile;
			} else if (!this.isMyRoom(this.creep.room.name) && !!this.creep.room.controller) {
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
				} else if (!!this.creep.room.controller && !!this.creep.room.controller.owner && this.creep.room.controller.my === false) {
					hostile = this.creep.pos.findClosestByPath<Structure>(this.creep.room.allStructures, {
						filter: (s: Structure) =>
							// s.structureType === STRUCTURE_WALL
							s.structureType === STRUCTURE_ROAD
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
		const w = this.squad.find((c: Creep) => c.memory.role === WarriorGovernor.ROLE);
		if (!this.creep.pos.isNearTo(w)) {
			this.moveTo(w.pos);
		}
	}

	public waitAtFlag(roomName: string) {
		const flag = Game.flags[roomName];
		if (!flag) {
			console.log(`Warfare Creep waitAtFlag error: No flag for room ${roomName} found.`);
		} else {
			if (!this.creep.pos.isNearTo(flag)) {
				this.moveTo(flag.pos);
			}
		}
	}

	public action(startCpu: number): boolean {
		this.startCpu = startCpu;
		if (!this.renewCreep()) {
			return false;
		} else {
			// yeah.
		}
		return true;
	}
}
