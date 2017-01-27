interface StructureLink {
	run(): void;
	send(): boolean;
	calcTotal(input: number): number;
}
StructureLink.prototype.calcTotal = function(input: number): number {
	return _.ceil(input / 0.97);
};

StructureLink.prototype.send = function(): boolean {
	const receivers: Structure[] = _(this.room.myGroupedStructures[STRUCTURE_LINK]).filter(
		(s: Structure) => !_.includes(global.linkBlackList, s.id) && s.id !== this.id
	).sortBy("energy").value();
	let sending: boolean = false;
	receivers.forEach((r: StructureLink) => {
		if (sending) {
			return true;
		}
		let transferValue: number = 400;
		const flags = r.pos.lookFor<Flag>(LOOK_FLAGS);
		if (flags.length > 0) {
			const flag = flags.shift();
			if (flag.color === COLOR_BLUE) { // IN link
				transferValue = 0;
			} else if (flag.color === COLOR_RED) { // OUT link
				transferValue = 800;
			}
		} else if (r.pos.inRangeTo(this.room.storage.pos, 2)) {
			transferValue = 800;
		}
		if (r.energy < transferValue) {
			transferValue = global.clamp(this.calcTotal(transferValue - r.energy), 0, this.energy);
			if (transferValue > 50) {
				const status = this.transferEnergy(r, transferValue);
				if (status !== OK) {
					this.transferEnergy(r);
				}
				sending = true;
				global.linkBlackList.push(r.id);
				return true;
			}
		}
	});
	return false;
};

StructureLink.prototype.run = function () {
	const storage = this.room.storage;
	if (!!storage && this.cooldown === 0) {
		if (this.pos.inRangeTo(storage.pos, 2)) {
			if (this.energy >= this.calcTotal(400)) {
				this.send();
			}
		} else {
			let transferValue: number = 400;
			const flags = this.pos.lookFor(LOOK_FLAGS);
			if (flags.length > 0) {
				const flag = flags.shift();
				if (flag.color === COLOR_BLUE) { // IN link
					transferValue = 600;
				} else if (flag.color === COLOR_RED) { // OUT link
					transferValue = 0;
					return;
				}
			}
			if (this.energy > (this.energyCapacity - transferValue)) {
				this.send();
			}
		}
	}
};
