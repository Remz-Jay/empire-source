import CreepAction from "../../components/creeps/creepAction";

export interface IWFCreepAction {
	wait: boolean;
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
		// STRUCTURE_STORAGE,
		// STRUCTURE_TERMINAL,
		// STRUCTURE_WALL,
		// STRUCTURE_SPAWN,
		// STRUCTURE_EXTENSION,
		STRUCTURE_ROAD,
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

	public moveToHeal(): boolean {
		if ((!!this.creep.stats.fullHealth.toughParts && !this.creep.stats.current.toughParts) || this.creep.memory.waitForHealth) {
			this.creep.memory.waitForHealth = true;
			if (this.creep.room.hostileCreeps.length > 0) {
				const capableTargets = global.filterWithCache(`capable-targets-${this.creep.room.name}`, this.creep.room.hostileCreeps,
					(c: Creep) => c.hasActiveBodyPart([ATTACK, RANGED_ATTACK])
				);
				if (this.creep.pos.findInRange(capableTargets, 3).length > 0) {
					if (this.positions) {
						this.creep.memory.positionIterator = this.positionIterator = 0;
						if (!this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
							this.moveTo(this.positions[this.positionIterator]);
						}
					} else {
						this.moveTo(Game.flags[this.creep.memory.homeRoom].pos);
					}
					return false;
				}
				return true;
			}
			return true;
		}
		return true;
	}

	public moveToSafeRange(): boolean {
		if (this.creep.room.hostileCreeps.length > 0) {
			const capableTargets = global.filterWithCache(`capable-targets-${this.creep.room.name}`, this.creep.room.hostileCreeps,
				(c: Creep) => c.hasActiveBodyPart([ATTACK, RANGED_ATTACK])
			);
			if (!!capableTargets && capableTargets.length > 0) {
				const targets = this.creep.pos.findInRange(capableTargets, 2);
				const totalDamage = _.sum(targets, (c: Creep) => c.stats.current.rangedAttack + c.stats.current.attack);
				const totalHeal = this.creep.stats.current.heal;
				if (totalDamage > totalHeal) {
					let range = 3;
					if (!!this.creep.stats.fullHealth.toughParts) {
						// if this creep was built with TOUGH, change the stance
						range = (!!this.creep.stats.current.toughParts) ? 3 : 4;
					}
					const goals = _.map(targets, function (t: Creep) {
						return {pos: t.pos, range: range};
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
		const isMyRoom = Game.rooms[roomName] && Game.rooms[roomName].my;
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
		if (this.positionIterator < 0) {
			this.positionIterator = 0;
		}
		if (this.positionIterator < this.positions.length) {
			if (!!this.positions[this.positionIterator]) {
				const p = this.positions[this.positionIterator];
				if (!!this.creep.memory.portalTarget) {
					const pt = this.creep.memory.portalTarget;
					const portalPos = new RoomPosition(pt.x, pt.y, pt.roomName);
					if (this.creep.pos.isEqualTo(portalPos)) {
						this.positionIterator = ++this.creep.memory.positionIterator;
						delete this.creep.memory.portalTarget;
						return this.moveUsingPositions();
					}
				}
				if (this.creep.pos.roomName === p.roomName && this.creep.room.groupedStructures[STRUCTURE_PORTAL].length > 0) {
					let portal = _(p.lookFor(LOOK_STRUCTURES)).filter((s: Structure) => s.structureType === STRUCTURE_PORTAL).first() as StructurePortal;
					if (!!portal) {
						this.creep.memory.portalTarget = portal.destination;
						if (!this.creep.pos.isNearTo(portal.pos)) {
							this.moveTo(portal.pos);
							return true;
						} else if (this.creep.pos.isNearTo(portal.pos)) {
							this.creep.move(this.creep.pos.getDirectionTo(portal.pos));
							this.creep.say("SO LONG!");
							return true;
						} else if (this.creep.pos.isEqualTo(p)) {
							this.positionIterator = ++this.creep.memory.positionIterator;
							this.creep.say("OHAI!");
							return this.moveUsingPositions();
						}
					}
				}
				if (!this.creep.pos.inRangeTo(p, range)) {
					this.moveTo(p);
				} else {
					this.positionIterator = ++this.creep.memory.positionIterator;
					return this.moveUsingPositions();
				}
			} else {
				this.positionIterator = ++this.creep.memory.positionIterator;
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
				if (doMass
					&& this.creep.room.alliedCreeps.length > 0
					&& this.creep.room.alliedCreeps.filter((c: Creep) => c.pos.inRangeTo(this.creep.pos, 3)).length > 0) {
					doMass = false;
				}
				if (doMass) {
					const massDamage = _.reduce(targets, (total: number, c: Creep) => {
						switch (c.pos.getRangeTo(this.creep.pos)) {
							case 1:
								return total + 10;
							case 2:
								return total + 4;
							case 3:
								return total + 1;
							default:
								return total;
						}
					}, 0);
					if (massDamage < RANGED_ATTACK_POWER) {
						doMass = false;
					}
				}
				if (doMass) {
					this.creep.rangedMassAttack();
				} else {
					const target = this.getPriorityCreep(targets);
					this.creep.rangedAttack(target);
				}
				return false;
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

	public findHealTarget(excludeMe: boolean = false): Creep {
		if (this.creep.room.myCreeps.length > 1) {
			const targets = (excludeMe) ? _.difference(this.creep.room.myCreeps, [this.creep]) : this.creep.room.myCreeps;
			const wounded = this.creep.pos.findClosestByRange<Creep>(targets, {
				filter: (c: Creep) => c.hits < c.hitsMax,
			});
			if (!!wounded) {
				return wounded;
			}
		}
		return undefined;
	}
	public findMeleeTarget(includeSourceKeepers: boolean = false): Creep {
		if (this.creep.room.hostileCreeps.length > 0) {
			// Prioritize Hostiles with offensive capabilities.
			let excludeUsernames: string[] = [];
			if (!includeSourceKeepers) {
				excludeUsernames.push("Source Keeper");
			}
			const hostiles = global.filterWithCache(`meleeTarget-${this.creep.room.name}`, this.creep.room.hostileCreeps,
				(c: Creep) => !_.includes(excludeUsernames, c.owner.username)
				&& c.hasActiveBodyPart([ATTACK, HEAL])
				&& this.validateSourceKeeper(c)
			) as Creep[];
			return this.findTarget(hostiles);
		}
		return undefined;
	}
	public findRangedTarget(includeSourceKeepers: boolean = false): Creep {
		if (this.creep.room.hostileCreeps.length > 0) {
			// Prioritize Hostiles with offensive capabilities.
			let excludeUsernames: string[] = [];
			if (!includeSourceKeepers) {
				excludeUsernames.push("Source Keeper");
			}
			const hostiles = global.filterWithCache(`rangedTarget-${this.creep.room.name}`, this.creep.room.hostileCreeps,
				(c: Creep) =>
				!_.includes(excludeUsernames, c.owner.username)
				&& c.hasActiveBodyPart([ATTACK, RANGED_ATTACK, HEAL])
				&& this.validateSourceKeeper(c)
			) as Creep[];
			return this.findTarget(hostiles);
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
	private validateSourceKeeper(creep: Creep): boolean {
		if (creep.owner.username !== "Source Keeper") {
			return true;
		} else {
			return (creep.pos.findInRange(this.creep.room.sources, 5).length === 0) ? false : true;
		}
	}

	private findTarget(hostiles: Creep[]): Creep {
		let hostile = this.creep.pos.findClosestByRange<Creep>(hostiles);
		if (!!hostile) {
			return (this.validateSourceKeeper(hostile)) ? hostile : undefined;
		} else {
			// Return worker creeps instead.
			hostile = this.creep.pos.findClosestByRange<Creep>(this.creep.room.hostileCreeps);
			if (!!hostile) {
				return (this.validateSourceKeeper(hostile)) ? hostile : undefined;
			}
		}
		return undefined;
	}
}
