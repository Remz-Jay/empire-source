import CreepAction from "../creepAction";

export default class Upgrader extends CreepAction {

	public static PRIORITY: number = global.PRIORITY_UPGRADER;
	public static MINRCL: number = global.MINRCL_UPGRADER;
	public static ROLE: string = "Upgrader";

	public static maxParts = 8;
	public static maxCreeps = 2;
	public static bodyPart = [CARRY, MOVE, WORK, WORK, WORK, MOVE];

	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const spawn = room.getFreeSpawn();
		const properties: CreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
			target_controller_id: room.controller.id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public static getCreepLimit(room: Room): number {
		switch (room.controller.level) {
			case 1:
			case 2:
			case 3:
				return 2;
			case 4:
				return 3;
			case 5:
				return 1;
			case 6:
				return 1;
			case 7:
				return 1;
			case 8:
				return 1;
			default:
				return global.clamp(_.floor(room.energyInContainers / 200000), 1, this.maxCreeps);
		}
	}

	public static getBody(room: Room) {
		if (room.controller.level === 8) {
			this.maxParts = 5;
		}
		if (room.controller.level < 5) { // Carry more stuff when links aren't available yet.
			this.bodyPart = [CARRY, WORK, MOVE];
		}
		return super.getBody(room);
	}

	public targetController: Controller;
	public targetEnergySource: Spawn | Structure;
	public boosts: string[] = [
		RESOURCE_CATALYZED_GHODIUM_ACID, // +100% upgradeController effectiveness without increasing the energy cost
	];

	public setCreep(creep: Creep) {
		super.setCreep(creep);

		this.targetController = Game.getObjectById<Controller>(this.creep.memory.target_controller_id);
		this.targetEnergySource = Game.getObjectById<Spawn | Structure>(this.creep.memory.target_energy_source_id);
		if (!this.targetController) {
			this.targetController = this.creep.room.controller;
			this.creep.memory.target_controller_id = this.targetController.id;
		}
	}

	public tryUpgrading(): number {
		return this.creep.upgradeController(this.targetController);
	}

	public moveToCollectEnergy(): void {
		if (!this.creep.pos.isNearTo(this.targetEnergySource.pos)) {
			this.moveTo(this.targetEnergySource.pos);
		} else {
			this.tryCollectEnergy();
		}
	}

	public tryCollectEnergy(): number {
		return this.creep.withdraw(this.targetEnergySource, RESOURCE_ENERGY);
	}

	public moveToController(): void {
		if (!this.creep.pos.inRangeTo(this.targetController.pos, 3)) {
			this.moveTo(this.targetController.pos);
		} else {
			this.tryUpgrading();
		}
	}

	public upgraderLogic() {
		if (this.creep.memory.dumping && this.creep.carry.energy === 0) {
			delete this.creep.memory.dumping;
			delete this.creep.memory.source;
			this.creep.say("U:COL");
		}
		if (!this.creep.memory.dumping && this.creep.carry.energy  > 0) {
			this.creep.memory.dumping = true;
			delete this.creep.memory.source;
			this.creep.say("U:UPGR");
		}
		if (this.creep.memory.dumping) {
			this.moveToController();
			if (this.creep.carry.energy < 50) {
				// see if we can get some from a nearby link
				const target = this.creep.room.myGroupedStructures[STRUCTURE_LINK].filter((l: StructureLink) => l.energy > 0
					&& l.pos.isNearTo(this.creep.pos)
				);
				if (!!target) {
					this.creep.withdraw(target.shift(), RESOURCE_ENERGY);
				}
			}
		} else {
			this.harvestFromContainersAndSources();
		}
	};

	public action(): boolean {
		if (this.getBoosted() && super.action()) {
			this.upgraderLogic();
		}
		return true;
	}

}
