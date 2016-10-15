import {default as CreepGovernor} from "../creepGovernor";

export default class RepairGovernor extends CreepGovernor {

	public static PRIORITY: number = global.PRIORITY_REPAIR;
	public static MINRCL: number = global.MINRCL_REPAIR;
	public static ROLE: string = "Repair";

	public bodyPart = [CARRY, CARRY, WORK, WORK, MOVE, MOVE];
	public maxParts = 6;
	public maxCreeps = 1;
	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${RepairGovernor.ROLE}-${global.time}`;
		const spawn = this.room.getFreeSpawn();
		const properties: CreepProperties = {
			homeRoom: this.room.name,
			role: RepairGovernor.ROLE,
			target_controller_id: this.room.controller.id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		if (this.room.controller.level === 8 && this.room.myConstructionSites.length === 0) {
			return 0;
		}
		return (this.room.controller.level < 5) ? 0 : _.floor(this.room.energyInContainers / 200000);
	};
}
