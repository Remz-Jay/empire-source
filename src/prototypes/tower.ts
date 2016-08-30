interface StructureTower {
	run(): void;
}
StructureTower.prototype.run = function () {
	if (this.room.hostileCreeps.length > 0) {
		let hostiles = this.pos.findInRange(FIND_HOSTILE_CREEPS, global.getTowerRange(this.room.name));
		let filteredHostiles = hostiles.filter((c: Creep) => c.getActiveBodyparts(ATTACK) > 2
			|| c.getActiveBodyparts(RANGED_ATTACK) > 2
			|| c.getActiveBodyparts(WORK) > 2
			|| c.getActiveBodyparts(HEAL) > 3
		);
		// TODO: Find a target without a healer next to it.
		let priority = _.sortBy(filteredHostiles, "hits").shift();
		if (!!priority) {
			this.attack(priority);
		} else {
			priority = this.pos.findClosestByRange(hostiles);
			if (!!priority) {
				this.attack(priority);
			}
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
