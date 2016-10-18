interface Creep {
	carrySum: number;
	bagFull: boolean;
	bagEmpty: boolean;
	logTransfer(target: Creep | Spawn | Structure, resourceType: string, amount?: number): number;
	pickupResourcesInRange(skipContainers?: boolean): void;
}

Object.defineProperty(Creep.prototype, "carrySum", {
	get: function carrySum() {
		delete this.carrySum;
		return this.carrySum = _.sum(this.carry);
	},
	configurable: true,
	enumerable: false,
});

Object.defineProperty(Creep.prototype, "bagFull", {
	get: function bagFull() {
		delete this.bagFull;
		return this.bagFull = (this.carrySum === this.carryCapacity);
	},
	configurable: true,
	enumerable: false,
});

Object.defineProperty(Creep.prototype, "bagEmpty", {
	get: function bagEmpty() {
		delete this.bagEmpty;
		return this.bagEmpty = (this.carrySum === 0);
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
