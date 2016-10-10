export interface CreepGovernorConstructor {
	new (room: Room): ICreepGovernor;
}

export default class CreepGovernor implements ICreepGovernor {
	public static MINRCL: number = global.MINRCL_CREEP;
	public static PRIORITY: number = global.PRIORITY_CREEP;
	public static ROLE: string = "Creep";

	public static calculateRequiredEnergy(body: string[]): number {
		return _.sum(body, (b: string) => BODYPART_COST[b]);
	};

	public static sortBodyParts(bodyParts: string[]): string[] {
		return _.sortBy(bodyParts, function (part) {
			switch (part) {
				case TOUGH:
					return 1;
				case CARRY:
					return 2;
				case MOVE:
					return 105;
				case CLAIM:
					return 106;
				case HEAL:
					return 110;
				case ATTACK:
					return 109;
				case RANGED_ATTACK:
					return 100;
				default:
					return 10;
			}
		});
	};

	public room: Room;
	public bodyPart: string[] = [WORK, MOVE, CARRY, MOVE];
	public maxParts: number = -1;
	public maxCreeps: number = 0;
	public emergency: boolean = false;
	constructor(room: Room) {
		this.room = room;
	}
	public getCreepConfig(): CreepConfiguration {
		return {body: [], name: "", properties: {role: null, homeRoom: null}};
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}

	public getNumberOfCreepsInRole(): number {
		return this.getCreepsInRole().length;
	}

	public getCreepsInRole(): Creep[] {
		return _.get(global.tickCache.rolesByRoom, `${Object.getPrototypeOf(this).constructor.ROLE}.${this.room.name}`, []);
	}

	public getBody() {
		const numParts = global.clamp(_.floor(this.room.energyCapacityAvailable / CreepGovernor.calculateRequiredEnergy(this.bodyPart)), 1, this.maxParts);
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return CreepGovernor.sortBodyParts(body);
	}

	public getBlackList(): string[] {
		return [];
	}
	public addToBlackList(targetId: string): void {
		return;
	}
	public checkContainerAssignment(): string {
		return undefined;
	}
}
