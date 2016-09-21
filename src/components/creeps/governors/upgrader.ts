import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";

export default class UpgraderGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = global.PRIORITY_UPGRADER;
	public static MINRCL: number = global.MINRCL_UPGRADER;
	public static ROLE: string = "Upgrader";

	public maxParts = 8;
	public maxCreeps = 2;
	public bodyPart = [CARRY, MOVE, WORK, WORK, WORK, MOVE];

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let spawn = this.room.getFreeSpawn();
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			role: UpgraderGovernor.ROLE,
			target_controller_id: this.room.controller.id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		if (this.room.controller.level === 8) {
			return 1;
		}
		if (this.room.name === "W2N46") {
			return 1;
		}
		let num: number;
		if (this.room.controller.level > 4) {
			num = _.floor(this.room.energyInContainers / 200000);
		} else if (this.room.controller.level < 5) {
			num = 4;
		} else {
			num = this.maxCreeps;
		}
		if (num > this.maxCreeps && this.room.controller.level > 4) {
			num = this.maxCreeps;
		}
		return (num > 0) ? num : 1;
	}

	public getBody() {
		if (this.room.controller.level === 8 || this.room.name === "W6N49") {
			this.maxParts = 5;
		}
		if (this.room.controller.level < 5) { // Carry more stuff when links aren't available yet.
			this.bodyPart = [CARRY, WORK, MOVE];
		}
		return super.getBody();
	}
}
