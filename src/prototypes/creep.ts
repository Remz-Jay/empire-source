interface Creep {
	carrySum: number;
	bagFull: boolean;
	bagEmpty: boolean;
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
