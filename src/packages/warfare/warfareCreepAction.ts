import CreepAction from "../../components/creeps/creepAction";

export interface IWFCreepAction {
	wait: boolean;
	checkTough(): boolean;
	moveToHeal(): boolean;
	moveToSafeRange(): boolean;
	moveToTargetRoom(): void;
	moveUsingPositions(): boolean;
}

export default class WFCreepAction extends CreepAction implements IWFCreepAction {
	public static config: RemoteRoomConfig;
	public static maxParts: number = 25;
	public static maxTough: number = 25;
	public static maxCreeps: number = 0;
	public static bodyPart: string[] = [];
	public static toughPart: string[] = [];
	public static basePart: string[] = [];

	public static setConfig(config: RemoteRoomConfig) {
		this.config = config;
	}

	public static getToughBody(room: Room): string[] {
		const numParts = global.clamp(_.floor(
			(room.energyCapacityAvailable - global.calculateRequiredEnergy(this.basePart)) /
			global.calculateRequiredEnergy(this.bodyPart)), 1, this.maxParts);

		let body: string[] = this.basePart;
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		const remainingEnergy = room.energyCapacityAvailable - global.calculateRequiredEnergy(body);
		const numTough = global.clamp(_.floor(remainingEnergy / global.calculateRequiredEnergy(this.toughPart)), 0, this.maxTough);
		for (let i = 0; i < numTough; i++) {
			if (body.length + this.toughPart.length <= 50) {
				body = body.concat(this.toughPart);
			}
		}
		return global.sortBodyParts(body);
	}

	public wait: boolean = false;
	public ignoreStructures: string[] = [
		STRUCTURE_STORAGE,
		STRUCTURE_TERMINAL,
		STRUCTURE_WALL,
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
		if (this.creep.room.hostileCreeps.length > 0) {
			const capableTargets = _.filter(this.creep.room.hostileCreeps, (c: Creep) => c.getActiveBodyparts(ATTACK) > 0
			|| c.getActiveBodyparts(RANGED_ATTACK) > 0);
			if (!!capableTargets && capableTargets.length > 0) {
				const targets = this.creep.pos.findInRange(capableTargets, 2);
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
			}
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

	public moveUsingPositions(range: number = 1): boolean {
		if (!this.positions) {
			return false;
		}
		if (this.positionIterator < this.positions.length) {
			if (!this.creep.pos.inRangeTo(this.positions[this.positionIterator], range)) {
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
			this.creep.say("🙏🏼", true);
			this.creep.heal(this.creep);
			return false;
		} else {
			const friendlies = _.union(this.creep.room.myCreeps, this.creep.room.alliedCreeps);
			if (friendlies.length > 1) { // Is it just me up in here?
				const targets = friendlies.filter(
					(c: Creep) => c.hits < c.hitsMax && c.pos.isNearTo(this.creep));
				if (targets.length > 0) {
					const target = this.getPriorityCreep(targets, reverse);
					this.creep.say("🙌🏼", true);
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
			const targetStructures = _.union(
				this.creep.room.groupedStructures[STRUCTURE_CONTAINER],
				this.creep.room.groupedStructures[STRUCTURE_WALL],
			);
			const targets = targetStructures.filter((s: Structure) => s.pos.isNearTo(this.creep));
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
			const targetStructures = _.union(
				this.creep.room.groupedStructures[STRUCTURE_ROAD],
				this.creep.room.groupedStructures[STRUCTURE_WALL],
				this.creep.room.groupedStructures[STRUCTURE_CONTAINER],
			);
			const targets = targetStructures.filter((s: Structure) => s.pos.inRangeTo(this.creep.pos, 3));
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
				this.creep.say("⚡", true);
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
			const hostile = this.creep.pos.findClosestByRange<Structure>(this.creep.room.groupedStructures[structureType]);
			return (!!hostile) ? hostile : undefined;
		}
		return undefined;
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
					const targetStructures = _.union(
						this.creep.room.groupedStructures[STRUCTURE_ROAD],
						this.creep.room.groupedStructures[STRUCTURE_CONTAINER],
						// this.creep.room.groupedStructures[STRUCTURE_WALL],
					);
					hostile = this.creep.pos.findClosestByPath<Structure>(targetStructures, {
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

	public action(): boolean {
		if (!this.renewCreep()) {
			return false;
		} else {
			// yeah.
		}
		return true;
	}
}
