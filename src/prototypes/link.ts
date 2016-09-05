interface StructureLink {
	run(): void;
}
StructureLink.prototype.run = function () {
	let storage = this.room.storage;
	let calcTotal = function(amount: number): number {
		return _.ceil(amount / 0.97);
	};
	if (!!storage && this.cooldown === 0) {
		if (this.pos.isNearTo(storage)) {
			if (this.energy >= calcTotal(400)) {
				let receivers = this.room.myStructures.filter((s: Structure) => s.structureType === STRUCTURE_LINK && s.id !== this.id);
				receivers.forEach((r: StructureLink) => {
					let transferValue: number = 400;
					let flags = r.pos.lookFor<Flag>(LOOK_FLAGS);
					if (flags.length > 0) {
						let flag = flags.shift();
						if (flag.color === COLOR_BLUE) { // IN link
							transferValue = 0;
						} else if (flag.color === COLOR_RED) { // OUT link
							transferValue = 800;
						}
					}
					if (r.energy < transferValue) {
						transferValue = calcTotal(transferValue - r.energy);
						if (this.energy < transferValue) {
							transferValue = this.energy;
						}
						if (transferValue > 0) {
							let status = this.transferEnergy(r, transferValue);
							if (status !== OK) {
								this.transferEnergy(r);
							}
						}
					}
				});
			}
		} else {
			let transferValue: number = 400;
			let flags = this.pos.lookFor(LOOK_FLAGS);
			if (flags.length > 0) {
				let flag = flags.shift();
				if (flag.color === COLOR_BLUE) { // IN link
					transferValue = 800;
				} else if (flag.color === COLOR_RED) { // OUT link
					transferValue = 0;
				}
			}
			if (this.energy > (this.energyCapacity - transferValue)) {
				let storageLink = this.room.myStructures.filter((s: Structure) => s.structureType === STRUCTURE_LINK && s.pos.isNearTo(storage))[0] as StructureLink;
				let canReceive = storageLink.energyCapacity - storageLink.energy;
				let toSend = this.energy - (this.energyCapacity - transferValue);
				if (toSend > canReceive) {
					toSend = canReceive;
				}
				if (toSend > 0) {
					this.transferEnergy(storageLink, toSend);
				}
			}
		}
	}
};
