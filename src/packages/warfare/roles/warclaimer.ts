import WarfareCreepAction from "../warfareCreepAction";

export default class WarClaimer extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_HEALER;
	public static MINRCL: number = global.MINRCL_WF_HEALER;
	public static ROLE: string = "WarClaimer";

	public static maxParts = 1;
	public static maxCreeps = 1;
	public static bodyPart	= [TOUGH, TOUGH, TOUGH,
		MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
		MOVE, MOVE, CLAIM,
	];

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

	public static getCreepLimit(room: Room): number {
		return this.maxCreeps;
	}

	public targetController: StructureController;
	public setCreep(creep: Creep, positions: RoomPosition[]) {
		super.setCreep(creep, positions);
		this.targetController = _.get(Game.rooms[this.creep.memory.config.targetRoom], "controller", undefined);
	}

	public action(): boolean {
		if (!this.moveUsingPositions()) {
			if (!this.creep.pos.isNearTo(this.targetController)) {
				this.moveTo(this.targetController.pos);
			} else {
				// once we're at the controller, claim it.
				this.creep.claimController(this.targetController);
			}
		}
		return true;
	}
}
