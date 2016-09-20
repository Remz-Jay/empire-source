import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";

export default class LinkerGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = global.PRIORITY_LINKER;
	public static MINRCL: number = global.MINRCL_LINKER;
	public static ROLE: string = "Linker";

	public bodyPart = [CARRY, CARRY, MOVE];
	public maxCreeps = 1;
	public maxParts = 5;

	public getCreepConfig(): CreepConfiguration {
		let bodyParts: string[] = this.getBody();
		let name: string = null;
		let properties: CreepProperties = {
			homeRoom: this.room.name,
			role: LinkerGovernor.ROLE,
			target_link_id: this.getStorageLink().id,
			target_storage_id: this.room.storage.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getCreepLimit(): number {
		let limit = 0;
		if (!!this.getStorageLink()) {
				limit = this.maxCreeps;
		}
		return limit;
	}

	public getStorageLink(): StructureLink {
		if (!!this.room.storage) {
			let link: StructureLink[] = _.filter(this.room.myStructures,
				(s: Structure) => s.structureType === STRUCTURE_LINK && s.pos.isNearTo(this.room.storage)) as StructureLink[];
			if (link.length > 0) {
				return link[0];
			} else {
				return undefined;
			}
		}
	}
}
