import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";

export default class BuilderGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = global.PRIORITY_BUILDER;
	public static ROLE: string = "Builder";
	public static MINRCL: number = global.MINRCL_BUILDER;

	public bodyPart: string[] = [WORK, MOVE, CARRY, MOVE];
	public maxParts: number = 5;

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
			target_construction_site_id: Object.keys(Game.constructionSites)[0],
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let sites = _.filter(Game.constructionSites, function (cs) {
			return cs.pos.roomName === this.room.name;
		}, this);
		if (sites.length > 0) {
			if (this.room.controller.level > 5) {
				return (_.floor(sites.length / 4) >= 1 ) ? _.floor(sites.length / 4) : 1;
			} else {
				return 1;
			}
		} else {
			return 0;
		}
	}
}
