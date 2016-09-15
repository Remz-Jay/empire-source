import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";

export default class RepairGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = global.PRIORITY_REPAIR;
	public static MINRCL: number = global.MINRCL_REPAIR;
	public static ROLE: string = "Repair";

	public bodyPart = [CARRY, CARRY, WORK, WORK, MOVE, MOVE];
	public maxParts = 4;
	public maxCreeps = 2;
	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let spawn = this.room.getFreeSpawn();
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			role: RepairGovernor.ROLE,
			target_controller_id: this.room.controller.id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let num: number = 0;
		if (this.room.controller.level < 5) {
			num = 0;
		} else {
			num = _.floor(this.room.energyInContainers / 200000);
		}
		return num;
	};
}
