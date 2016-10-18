interface OwnedStructure {
	memory: any;
	checkSafeMode(): boolean;
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

Object.defineProperty(OwnedStructure.prototype, "checkSafeMode", {
	value: function(): boolean {
		if (this.room.hostileCreeps.length === 0) {
			return false;
		}
		const hostile: Creep = _(this.safeLook(LOOK_CREEPS, 1)).map("creep").filter(
			(c: Creep) => !c.my && !_.includes(global.alliedPlayers, c.owner.username)
			&& (c.getActiveBodyparts(ATTACK) > 2
			|| c.getActiveBodyparts(RANGED_ATTACK) > 2
			|| c.getActiveBodyparts(WORK) > 2)
		).first() as Creep;
		if (!!hostile) {
			if (!this.room.controller.safeMode                  // See if we're not in safeMode already (undefined when not)
				&& !this.room.controller.safeModeCooldown       // See if we're not in cooldown (undefined when not)
				&& this.room.controller.safeModeAvailable > 0   // See if we have credits
			) {
				const status = this.room.controller.activateSafeMode();
				Game.notify(`WARNING: Placed room ${this.room.name} in safeMode due to hostiles being near! Status: ${global.translateErrorCode(status)}`);
			}
			return true;
		} else {
			return false;
		}
	},
	configurable: true,
	enumerable: false,
});
