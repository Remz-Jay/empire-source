import {default as CreepGovernor} from "../creepGovernor";

export default class LinkerGovernor extends CreepGovernor {

	public static PRIORITY: number = global.PRIORITY_LINKER;
	public static MINRCL: number = global.MINRCL_LINKER;
	public static ROLE: string = "Linker";

	public bodyPart = [CARRY];
	public basePart = [MOVE];
	public maxCreeps = 1;
	public maxParts = 10;

	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${LinkerGovernor.ROLE}-${global.time}`;
		const properties: CreepProperties = {
			homeRoom: this.room.name,
			role: LinkerGovernor.ROLE,
			target_link_id: this.getStorageLink().id,
			target_storage_id: this.room.storage.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getBody() {
		let numParts: number = _.floor(
			(this.room.energyCapacityAvailable - CreepGovernor.calculateRequiredEnergy(this.basePart)) /
			CreepGovernor.calculateRequiredEnergy(this.bodyPart)
		);
		numParts = global.clamp(numParts, 1, this.maxParts);
		let body: string[] = this.basePart;
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return CreepGovernor.sortBodyParts(body);
	}

	public getCreepLimit(): number {
		if (!!Game.flags[this.room.name + "_LS"]) {
			return this.maxCreeps;
		}
		return (!!this.getStorageLink()) ? this.maxCreeps : 0;
	}

	public getStorageLink(): StructureLink {
		if (!!this.room.storage) {
			const link: StructureLink[] = _(this.room.myGroupedStructures[STRUCTURE_LINK])
				.filter((s: OwnedStructure) => s.pos.inRangeTo(this.room.storage.pos, 2)).value() as StructureLink[];
			if (link.length > 0) {
				return link[0];
			} else {
				return undefined;
			}
		}
	}
}
