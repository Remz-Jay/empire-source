import {default as CreepGovernor} from "../creepGovernor";

export default class UpgraderGovernor extends CreepGovernor {

	public static PRIORITY: number = global.PRIORITY_UPGRADER;
	public static MINRCL: number = global.MINRCL_UPGRADER;
	public static ROLE: string = "Upgrader";

	public maxParts = 8;
	public maxCreeps = 2;
	public bodyPart = [CARRY, MOVE, WORK, WORK, WORK, MOVE];

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${UpgraderGovernor.ROLE}-${global.time}`;
		const spawn = this.room.getFreeSpawn();
		const properties: CreepProperties = {
			homeRoom: this.room.name,
			role: UpgraderGovernor.ROLE,
			target_controller_id: this.room.controller.id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		switch (this.room.controller.level) {
			case 1:
			case 2:
			case 3:
				return 2;
			case 4:
				return 3;
			case 5:
				return 2;
			case 6:
				return 1;
			case 7:
				return 1;
			case 8:
				return 1;
			default:
				return global.clamp(_.floor(this.room.energyInContainers / 200000), 1, this.maxCreeps);
		}
	}

	public getBody() {
		if (this.room.controller.level === 8) {
			this.maxParts = 5;
		}
		if (this.room.controller.level < 5) { // Carry more stuff when links aren't available yet.
			this.bodyPart = [CARRY, WORK, MOVE];
		}
		return super.getBody();
	}
}
