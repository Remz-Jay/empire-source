import WarfareCreepGovernor from "../../../packages/warfare/warfareCreepGovernor";

export default class PowerHarvesterGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "PowerHarvester";

	public maxParts = 25;
	public maxCreeps = 1;
	public bodyPart = [ATTACK, MOVE];

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${PowerHarvesterGovernor.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: PowerHarvesterGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}
	public getBody(): string[] {
		return super.getBody();
	}
}
