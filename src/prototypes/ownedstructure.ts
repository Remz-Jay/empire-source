interface OwnedStructure {
	memory: any;
}
Object.defineProperty(OwnedStructure.prototype, "memory", {
	get: function () {
		if (!Memory.structures) {
			Memory.structures = {};
		}
		if (!Memory.structures[this.id]) {
			Memory.structures[this.id] = {};
		}
		return Memory.structures[this.id];
	},
	set: function(v: any) {
		return _.set(Memory, `structures.${this.id}`, v);
	},
	configurable: true,
	enumerable: false,
});
