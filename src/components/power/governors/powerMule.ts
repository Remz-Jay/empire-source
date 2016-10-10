import WarfareCreepGovernor from "../../../packages/warfare/warfareCreepGovernor";

export default class PowerMuleGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "PowerMule";

	public maxParts = 12;
	public maxCreeps = 3;
	public bodyPart = [CARRY, CARRY, CARRY, MOVE]; // 1850 carry total
	public basePart = [CARRY, MOVE];

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${PowerMuleGovernor.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: PowerMuleGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}
	public getBody(): string[] {
		return super.getBody();
	}
}
