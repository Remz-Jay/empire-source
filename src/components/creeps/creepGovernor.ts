import * as Config from "../../config/config";

export interface CreepConfiguration {
	body: string[];
	name: string;
	properties: CreepProperties;
}
export interface CreepProperties {
	role: string;
	homeRoom: string;
	homeSpawn: string;
	targetRoom?: string;
	target_link_id?: string;
	target_storage_id?: string;
	target_energy_dropoff_id?: string;
	target_energy_source_id?: string;
	target_source_id?: string;
	target_construction_site_id?: string;
	target_controller_id?: string;
}
export interface CreepGovernorConstructor {
	new (room: Room): ICreepGovernor;
}
export interface ICreepGovernor {
	bodyPart: string[];
	maxParts: number;
	maxCreeps: number;
	emergency: boolean;
	getCreepConfig(): CreepConfiguration;
	getCreepLimit(): number;
	getBody(): string[];
	getNumberOfCreepsInRole(): number;
	getCreepsInRole(): Creep[];
}

export default class CreepGovernor implements ICreepGovernor {
	public static MINRCL: number = Config.MINRCL_CREEP;
	public static PRIORITY: number = Config.PRIORITY_CREEP;
	public static ROLE: string = "Creep";
	public static calculateRequiredEnergy(body: string[]): number {
		let cost = 0;
		_.forEach(body, function (n) {
			switch (n) {
				case CARRY:
				case MOVE:
					cost += 50;
					break;
				case WORK:
					cost += 100;
					break;
				case ATTACK:
					cost += 80;
					break;
				case RANGED_ATTACK:
					cost += 150;
					break;
				case HEAL:
					cost += 250;
					break;
				case CLAIM:
					cost += 600;
					break;
				case TOUGH:
					cost += 10;
					break;
				default:
					console.log(`Unknown BODY_PART: ${n}`);
			}
		});

		return cost;
	};

	public static sortBodyParts(bodyParts: string[]): string[] {
		return _.sortBy(bodyParts, function (part) {
			switch (part) {
				case TOUGH:
					return 1;
				case CARRY:
					return 2;
				case MOVE:
					return 5;
				case CLAIM:
					return 80;
				case HEAL:
					return 90;
				case ATTACK:
					return 95;
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
		return {body: [], name: "", properties: {role: null, homeRoom: null, homeSpawn: null}};
	}

	public getCreepLimit(): number {
		return this.maxCreeps;
	}

	public getNumberOfCreepsInRole(): number {
		return this.getCreepsInRole().length;
	}

	public getCreepsInRole(): Creep[] {
		return _.filter(Game.creeps, (creep: Creep) => creep.memory.role === Object.getPrototypeOf(this).constructor.ROLE
		&& creep.memory.homeRoom === this.room.name);
	}

	public getBody() {
		let numParts = _.floor(this.room.energyCapacityAvailable / CreepGovernor.calculateRequiredEnergy(this.bodyPart));
		if (numParts < 1) {
			numParts = 1;
		}
		if (this.maxParts > 1 && numParts > this.maxParts) {
			numParts = this.maxParts;
		}
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			body = body.concat(this.bodyPart);
		}
		return CreepGovernor.sortBodyParts(body);
	}
}
