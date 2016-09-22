interface StructureTower {
	run(): boolean;
}
StructureTower.prototype.run = function(): boolean {
	let damagedCreeps = this.room.myCreeps.filter((c: Creep) => !_.includes(this.room.towerTargets, c) && c.hits < c.hitsMax);
	if (damagedCreeps.length > 0) {
		let target = _.sortBy(damagedCreeps, "hits").shift();
		this.room.towerTargets.push(target);
		this.heal(target);
		return true;
	}
	if (this.room.hostileCreeps.length > 0) {
		let hostiles: Creep[] = this.pos.findInRange(this.room.hostileCreeps, global.getTowerRange(this.room.name));
		let filteredHostiles: Creep[] = hostiles.filter((c: Creep) =>
			!_.includes(this.room.towerTargets, c)
			&& (c.getActiveBodyparts(ATTACK) > 2
			|| c.getActiveBodyparts(RANGED_ATTACK) > 2
			|| c.getActiveBodyparts(WORK) > 2
			|| c.getActiveBodyparts(HEAL) > 3)
		);
		// TODO: Find a target without a healer next to it.
		let priority: Creep = _.sortBy(filteredHostiles, "hits").shift();
		if (!!priority) {
			if (!this.room.controller.safeMode                  // See if we're not in safeMode already (undefined when not)
				&& !this.room.controller.safeModeCooldown       // See if we're not in cooldown (undefined when not)
				&& this.room.controller.safeModeAvailable > 0   // See if we have credits
				&& this.pos.isNearTo(priority.pos)              // See if capable hostiles are near this tower, which should trigger safeMode
			) {
				let status = this.room.controller.activateSafeMode();
				Game.notify(`WARNING: Placed room ${this.room.name} in safeMode due to hostiles attacking a tower! Status: ${global.translateErrorCode(status)}`);
			}
			this.room.towerTargets.push(priority);
			this.attack(priority);
			return true;
		} else {
			priority = this.pos.findClosestByRange(hostiles);
			if (!!priority) {
				this.room.towerTargets.push(priority);
				this.attack(priority);
				return true;
			}
		}
	}
	if (this.energy > (this.energyCapacity / 2)) {
		let minHits: number = this.room.controller.level * 11000;
		let damagedStructures = this.room.allStructures.filter((structure: OwnedStructure) =>
			!_.includes(this.room.towerTargets, structure)
			&& structure.hits < (structure.hitsMax * 0.8) &&
			(
				(structure.structureType !== STRUCTURE_RAMPART && structure.structureType !== STRUCTURE_WALL)
				|| (structure.structureType === STRUCTURE_RAMPART && structure.my && structure.hits < minHits)
				|| (structure.structureType === STRUCTURE_WALL && structure.hits < minHits)
			),
		);
		if (damagedStructures.length > 0) {
			let target = _.sortBy(damagedStructures, "hits").shift();
			this.room.towerTargets.push(target);
			this.repair(target);
			return true;
		}
	}
	return false;
};
