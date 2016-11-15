import WarfareCreepAction from "../../../packages/warfare/warfareCreepAction";

export default class PowerHealer extends WarfareCreepAction  {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "PowerHealer";

	public static maxParts = 21;
	public static maxCreeps = 2;
	public static bodyPart = [HEAL, MOVE];

	public static getCreepConfig(room: Room): CreepConfiguration {
		const bodyParts: string[] = this.getBody(room);
		const name: string = `${room.name}-${this.ROLE}-${global.time}`;
		const properties: RemoteCreepProperties = {
			homeRoom: room.name,
			role: this.ROLE,
			config: this.config,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public static getBody(room: Room): string[] {
		const numParts = global.clamp(_.floor(room.energyCapacityAvailable / global.calculateRequiredEnergy(this.bodyPart)), 1, this.maxParts);
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return body;
	}

	public boosts: string[] = [
		RESOURCE_LEMERGIUM_OXIDE, // +100% heal and rangedHeal effectiveness
	];

	public move(): void {
		if (!this.moveUsingPositions(2)) {
			const closest = this.creep.pos.findClosestByRange(
				global.filterWithCache(`ph-${this.creep.room.name}-attack`, this.creep.room.myCreeps, (c: Creep) => c.hasActiveBodyPart(ATTACK)) as Creep[])
				|| this.creep.pos.findClosestByRange(_.filter(this.creep.room.myCreeps, (c: Creep) => c.id !== this.creep.id && c.stats.current.heal < 6 * HEAL_POWER)
			);
			if (!!closest && !this.creep.pos.isNearTo(closest)) {
				// get in range
				this.creep.moveTo(closest);
			} else if (!!closest) {
				// stay in range
				this.creep.move(this.creep.pos.getDirectionTo(closest.pos));
			}
		}
	}

	public action(): boolean {
		if (this.heal(true)) { // Reverse targeting for Tanks.
			this.rangedHeal();
		}
		if (this.getBoosted()) {
			this.move();
		}
		return true;
	}
}
