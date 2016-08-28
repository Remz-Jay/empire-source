interface StructureTower {
	run(): void;
}
StructureTower.prototype.run = function () {
	if (this.room.hostileCreeps.length > 0) {
		let closestHostile = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
		if (closestHostile) {
			this.attack(closestHostile);
		}
	} else if (this.energy > (this.energyCapacity / 2)) {
		let damagedCreeps = this.room.myCreeps.filter((c: Creep) => c.hits < c.hitsMax);
		if (damagedCreeps.length > 0) {
			this.heal(_.sortBy(damagedCreeps, "hits").shift());
		} else {
			let damagedStructures = this.room.allStructures.filter((structure: OwnedStructure) =>
				structure.hits < (structure.hitsMax * 0.8) &&
				(
					(structure.structureType !== STRUCTURE_RAMPART && structure.structureType !== STRUCTURE_WALL)
					|| (structure.structureType === STRUCTURE_RAMPART && structure.my && structure.hits < 150000)
					|| (structure.structureType === STRUCTURE_WALL && structure.hits < 200000)
				),
			);
			if (damagedStructures.length > 0) {
				this.repair(_.sortBy(damagedStructures, "hits").shift());
			}
		}
	}
};
