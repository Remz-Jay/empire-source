import WarfareCreepAction from "../warfareCreepAction";

export interface IWarBuilder {
	action(startCpu: number): boolean;
}

export default class WarBuilder extends WarfareCreepAction implements IWarBuilder {
	public storage: StructureStorage;
	public boosts: string[] = [
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
		RESOURCE_CATALYZED_LEMERGIUM_ACID, // +100% build/repair
	];
	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
		this.storage = this.creep.room.storage;
	}

	public action(startCpu: number): boolean {
		this.startCpu = startCpu;
		if (this.getBoosted()) {
			if (!this.moveUsingPositions()) {
				if (this.creep.carry.energy === 0) {
					if (!!this.storage && this.storage.store.energy > 0) {
						if (!this.creep.pos.isNearTo(this.storage.pos)) {
							this.moveTo(this.storage.pos);
						} else {
							this.creep.withdraw(this.storage, RESOURCE_ENERGY);
						}
					} else {
						this.harvestFromContainersAndSources();
					}
				} else {
					/*const positions = this.safeLook(LOOK_STRUCTURES, this.creep.pos, 3);
					const rampart: StructureRampart;
					positions.forEach((pos: any) => {
						if (pos.structure.structureType === STRUCTURE_RAMPART) {
							rampart = pos.structure;
						}
					});
					if (!!rampart) {
						this.creep.repair(rampart);
					} else {*/
						let target: ConstructionSite;
						if (!this.creep.memory.target) {
							target = this.creep.pos.findClosestByRange(this.creep.room.myConstructionSites);
							if (!!target) {
								this.creep.memory.target = target.id;
							}
						} else {
							target = Game.getObjectById(this.creep.memory.target) as ConstructionSite;
						}
						if (!!target) {
							if (!this.creep.pos.inRangeTo(target.pos, 3)) {
								this.moveTo(target.pos);
							} else {
								this.creep.build(target);
							}
						} else {
							delete this.creep.memory.target;
						}
					// }
				}
			}
		}
		return true;
	}
}
