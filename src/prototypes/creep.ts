interface Creep {
	carrySum: number;
	bagFull: boolean;
	bagEmpty: boolean;
	stats: CreepStatsObject;
	getStats(): CreepStatsObject;
	logTransfer(target: Creep | Spawn | Structure, resourceType: string, amount?: number): number;
	pickupResourcesInRange(skipContainers?: boolean): void;
	getReverseActiveBodyparts(type: string): number;
	hasActiveBodyPart(type: string | string[]): boolean;
}

Object.defineProperty(Creep.prototype, "carrySum", {
	get: function() {
		return (!!this.__carrySum) ? this.__carrySum : this.__carrySum = _.sum(this.carry);
	},
	configurable: true,
	enumerable: false,
});

Object.defineProperty(Creep.prototype, "bagFull", {
	get: function () {
		return (!!this.__bagFull) ? this.__bagFull : this.__bagFull = (this.carrySum === this.carryCapacity);
	},
	configurable: true,
	enumerable: false,
});

Object.defineProperty(Creep.prototype, "bagEmpty", {
	get: function () {
		return (!!this.__bagEmpty) ? this.__bagEmpty : this.__bagEmpty = (this.carrySum === 0);
	},
	configurable: true,
	enumerable: false,
});

Object.defineProperty(Creep.prototype, "logTransfer", {
	value: function(target: Creep | Spawn | Structure, resourceType: string, amount?: number): number {
		const busy = _.get(global, `tickCache.creeps.${this.id}.transfered`, false);
		if (!busy) {
			const status = this.transfer.apply(this, arguments);
			if (status === OK) {
				_.set(global, `tickCache.creeps.${this.id}.transfered`, true);
			}
			return status;
		} else {
			return ERR_BUSY;
		}
	},
	configurable: true,
	enumerable: false,
});

Object.defineProperty(Creep.prototype, "pickupResourcesInRange", {
	value: function(skipContainers: boolean = false): void {
		if (!this.bagFull) {
			const r = _(this.safeLook(LOOK_RESOURCES, 1)).map("resource").first();
			if (!!r) {
				this.pickup(r);
			} else if (!skipContainers) {
				const container = _(this.room.groupedStructures[STRUCTURE_CONTAINER]).filter((s: StructureContainer) =>
					s.store.energy > 0 && s.pos.isNearTo(this.pos)
				).first();
				if (!!container) {
					this.withdraw(container, RESOURCE_ENERGY);
				}
			}
		}
	},
	configurable: true,
	enumerable: false,
});
Object.defineProperty(Creep.prototype, "getStats", {
	value: function() {
		const fullHealth = {
			attack: 0,
			dismantle: 0,
			heal: 0,
			rangedAttack: 0,
			toughParts: 0,
			toughReduction: 1,
			hits: this.hitsMax,
		};
		const current = _.clone(fullHealth);
		current.hits = this.hits;
		const DISMANTLE = "dismantle";
		const DAMAGE = "damage";
		_.forEach(this.body, (part: BodyPartDefinition) => {
			let fullToughValues: number[] = [];
			let currToughValues: number[] = [];
			switch (part.type) {
				case ATTACK: {
					const attackAmount = ATTACK_POWER * (part.boost ? BOOSTS[ATTACK][part.boost][ATTACK] : 1);
					fullHealth.attack = fullHealth.attack + attackAmount;
					current.attack += !!part.hits ? attackAmount : 0;
					break;
				}
				case WORK: {
					const dismantleAmount = DISMANTLE_POWER * (part.boost ? BOOSTS[WORK][part.boost][DISMANTLE] : 1);
					fullHealth.dismantle = fullHealth.dismantle + dismantleAmount;
					current.dismantle += !!part.hits ? dismantleAmount : 0;
					break;
				}
				case HEAL: {
					const healAmount = HEAL_POWER * (part.boost ? BOOSTS[HEAL][part.boost][HEAL] : 1);
					fullHealth.heal = fullHealth.heal + healAmount;
					current.heal += !!part.hits ? healAmount : 0;
					break;
				}
				case RANGED_ATTACK: {
					const rangedAttackAmount = RANGED_ATTACK_POWER * (part.boost ? BOOSTS[RANGED_ATTACK][part.boost][_.camelCase(RANGED_ATTACK)] : 1);
					fullHealth.rangedAttack = fullHealth.rangedAttack + rangedAttackAmount;
					current.rangedAttack += !!part.hits ? rangedAttackAmount : 0;
					break;
				}
				case TOUGH:
					fullToughValues.push((part.boost ? BOOSTS[TOUGH][part.boost][DAMAGE] : 1));
					if (!!part.hits) {
						currToughValues.push((part.boost ? BOOSTS[TOUGH][part.boost][DAMAGE] : 1));
					}
					break;
				default:
				// Disregard other parts
			}
			if (fullToughValues.length > 0) {
				fullHealth.toughReduction = _.sum(fullToughValues) / fullToughValues.length;
				fullHealth.toughParts = fullToughValues.length;
			}
			if (currToughValues.length > 0) {
				current.toughReduction = _.sum(currToughValues) / currToughValues.length;
				current.toughParts = currToughValues.length;
			}
		});
		return {
			fullHealth,
			current,
		};
	},
	configurable: true,
	enumerable: false,
});
Object.defineProperty(Creep.prototype, "stats", {
	get: function() {
		return (!!this.__stats) ? this.__stats : this.__stats = this.getStats();
	},
	configurable: true,
	enumerable: false,
});
Object.defineProperty(Creep.prototype, "getReverseActiveBodyparts", {
	value: function (type: string) {
		let count = 0;
		for (let i = this.body.length - 1; i >= 0; i = i - 1) {
			if (this.body[i].hits <= 0) {
				break;
			}
			if (this.body[i].type === type) {
				count = count + 1;
			}
		}
		return count;
	},
	configurable: true,
	enumerable: false,
});
Object.defineProperty(Creep.prototype, "hasActiveBodyPart", {
	value: function (type: string | string[]) {
		if (_.isString(type)) {
			type = [type];
		}
		return (!!_.findLast(this.body, (b: BodyPartDefinition) => _.includes(type, b.type) && !!b.hits));
	},
	configurable: true,
	enumerable: false,
});
