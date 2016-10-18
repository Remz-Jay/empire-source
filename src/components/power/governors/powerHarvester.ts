import WarfareCreepGovernor from "../../../packages/warfare/warfareCreepGovernor";

export default class PowerHarvesterGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "PowerHarvester";

	public maxParts: number = 16;
	public maxTough: number = 0;
	public maxCreeps: number = 1;
	public bodyPart: string[] = [ATTACK, ATTACK, MOVE];
	public basePart: string[] = [ATTACK, MOVE];
	public toughPart: string[] = [];

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
		return super.getToughBody();
	}
}
