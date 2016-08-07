interface StructureTower {
	run(): void;
}
StructureTower.prototype.run = function () {
	let closestHostile = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
	if (closestHostile) {
		this.attack(closestHostile);
	} else if (this.energy > (this.energyCapacity / 2)) {
		let closestDamagedStructure = this.pos.findClosestByRange(FIND_STRUCTURES, {
			filter: (structure: OwnedStructure) => structure.hits < (structure.hitsMax * 0.8) &&
			(
				(structure.structureType !== STRUCTURE_RAMPART
				&& structure.structureType !== STRUCTURE_WALL)
				|| (structure.structureType === STRUCTURE_RAMPART
				&& structure.my
				&& structure.hits < 2000000)
				|| (structure.structureType === STRUCTURE_WALL
					&& structure.hits < 100000
				)
			),
		});
		if (closestDamagedStructure) {
			this.repair(closestDamagedStructure);
		}

		let closestDamagedCreep = this.pos.findClosestByRange(FIND_MY_CREEPS, {
			filter: (c: Creep) => {
				return c.hits < c.hitsMax;
			}
		});
		if (closestDamagedCreep) {
			this.heal(closestDamagedCreep);
		}
	}
};
