import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";

export default class BuilderGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = global.PRIORITY_BUILDER;
	public static ROLE: string = "Builder";
	public static MINRCL: number = global.MINRCL_BUILDER;

	public bodyPart: string[] = [WORK, CARRY, MOVE];
	public maxParts: number = 5;
	public maxCreeps: number = 1;

	constructor(room: Room) {
		super(room);
	}

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let spawn = this.room.getFreeSpawn();
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			role: BuilderGovernor.ROLE,
			target_construction_site_id: this.room.myConstructionSites[0].id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let sites = this.room.myConstructionSites;
		return (sites.length > 0) ? 1 : 0;
	}
}
