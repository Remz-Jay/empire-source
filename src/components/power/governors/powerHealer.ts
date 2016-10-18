import WarfareCreepGovernor from "../../../packages/warfare/warfareCreepGovernor";

export default class PowerHealerGovernor extends WarfareCreepGovernor {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "PowerHealer";

	public maxParts = 21;
	public maxCreeps = 2;
	public bodyPart = [HEAL, MOVE];

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${PowerHealerGovernor.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: this.room.name,
			role: PowerHealerGovernor.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getBody(): string[] {
		const numParts = global.clamp(_.floor(this.room.energyCapacityAvailable / PowerHealerGovernor.calculateRequiredEnergy(this.bodyPart)), 1, this.maxParts);
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return body;
	}
}
