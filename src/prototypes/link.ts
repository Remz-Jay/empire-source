interface StructureLink {
	run(): void;
}
StructureLink.prototype.run = function () {
	let storage = this.room.storage;
	let calcTotal = function(amount: number): number {
		return _.ceil(amount + ((3 / 100) * amount));
	};
	if (!!storage && this.cooldown === 0) {
		if (this.pos.isNearTo(storage)) {
			if (this.energy >= calcTotal(400)) {
				let receivers = this.room.myStructures.filter((s: Structure) => s.structureType === STRUCTURE_LINK && s.id !== this.id);
				_.each(receivers, function (r: StructureLink) {
					if (r.energy < 400 && this.cooldown === 0) {
						this.transferEnergy(r, (calcTotal(400 - r.energy)));
					}
				}, this);
			}
		} else {
			if (this.energy >= 600) {
				let storageLink = this.room.myStructures.filter((s: Structure) => s.structureType === STRUCTURE_LINK && s.pos.isNearTo(storage))[0] as StructureLink;
				let canReceive = storageLink.energyCapacity - storageLink.energy;
				let toSend = this.energy - 400;
				if (toSend > canReceive) {
					toSend = canReceive;
				}
				this.transferEnergy(storageLink, toSend);
			}
		}
	}
};
