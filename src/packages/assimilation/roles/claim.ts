import ASMCreepAction from "../assimilationCreepAction";

export default class Claim extends ASMCreepAction {
	public static PRIORITY: number = global.PRIORITY_ASM_CLAIM;
	public static MINRCL: number = global.MINRCL_ASM_CLAIM;
	public static ROLE: string = "Claim";

	public static claim: boolean = false;
	public static reserveOnly: boolean = false;
	public static maxParts = 5;
	public static maxCreeps = 1;
	public static bodyPart = [CLAIM, MOVE];

	public static setConfig(config: RemoteRoomConfig, claim: boolean = false, reserveOnly = false) {
		super.setConfig(config);
		this.claim = claim;
		this.reserveOnly = reserveOnly;
	}

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

	public static getBody(room: Room) {
		if (this.claim) {
			return global.sortBodyParts([TOUGH, TOUGH,
				MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
				MOVE, MOVE, CLAIM,
			]);
		} else {
			if (this.reserveOnly) {
				this.maxParts = 2;
			}
			return super.getBody(room);
		}
	}

	public doClaim: boolean;
	public targetController: StructureController;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.doClaim = false;
		this.targetController = Game.rooms[this.creep.memory.config.targetRoom] ? Game.rooms[this.creep.memory.config.targetRoom].controller || undefined : undefined;
	}

	public assimilateRoom() {
		if (!this.targetController) {
			const flag = Game.flags[this.creep.memory.config.targetRoom];
			if (!!flag) {
				this.moveTo(flag.pos);
			} else {
				console.log("Claimer - no flag found for " + this.creep.memory.config.targetRoom);
			}
			return;
		}
		if (!this.creep.pos.isNearTo(this.targetController)) {
			this.moveTo(this.targetController.pos);
		} else {
			// once we're at the controller, claim it.
			if (this.doClaim) {
				this.creep.claimController(this.targetController);
			} else {
				this.creep.reserveController(this.targetController);
			}
		}
	}

	public action(): boolean {
		this.creep.say(this.creep.memory.config.targetRoom);
		if (this.flee()) {
			this.assimilateRoom();
		}
		return true;
	}
}
