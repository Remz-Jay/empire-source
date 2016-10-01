// import * as RoomManager from "../../../components/rooms/roomManager";
import AssimilationCreepGovernor from "../assimilationCreepGovernor";

export default class ASMBuilderGovernor extends AssimilationCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_ASM_BUILDER;
	public static MINRCL: number = global.MINRCL_ASM_BUILDER;
	public static ROLE: string = "ASMBuilder";

	public maxParts = 8;
	public maxCreeps = 4;
	public bodyPart = [WORK, MOVE, CARRY, MOVE, CARRY, MOVE];

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${ASMBuilderGovernor.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: ASMBuilderGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		return 1;
/*		const targetRoom = RoomManager.getRoomByName(this.config.targetRoom);
		const num: number;
		if (targetRoom.controller.level > 4) {
			num = _.floor(targetRoom.energyInContainers / 10000);
		} else if (targetRoom.controller.level < 3) {
			num = this.maxCreeps;
		} else {
			num = this.maxCreeps;
		}
		if (num > this.maxCreeps) {
			num = this.maxCreeps;
		}
		return (num > 0) ? num : 1;*/
	}
}
