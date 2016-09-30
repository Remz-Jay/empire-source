import WarfareCreepGovernor from "../warfareCreepGovernor";

export default class WarriorGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Warrior";

	public maxParts = 12;
	public maxCreeps = 2;
	public bodyPart = [ATTACK, ATTACK, ATTACK, MOVE];
	public basePart = [TOUGH, MOVE]; // TODO: 8x TOUGH = optimized for powerSpawns

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = `${this.room.name}-${WarriorGovernor.ROLE}-${global.time}`;
		let properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: WarriorGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}
	public getBody(): string[] {
		return super.getToughBody();
	}
}
