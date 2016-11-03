import WarfareCreepAction from "../warfareCreepAction";

export default class Bully extends WarfareCreepAction {

	public static PRIORITY: number = global.PRIORITY_WF_WARRIOR;
	public static MINRCL: number = global.MINRCL_WF_WARRIOR;
	public static ROLE: string = "Bully";

	public static maxParts = 20;
	public static maxCreeps = 2;
	public static bodyPart = [ATTACK, MOVE];
	public static basePart = [HEAL, HEAL, HEAL, HEAL, HEAL, MOVE, MOVE, MOVE, MOVE, MOVE];

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
		return super.getToughBody(room);
	}

	public sourceKeeperDuty: boolean = true;

	public setCreep(creep: Creep, positions?: RoomPosition[]) {
		super.setCreep(creep, positions);
	}

	public move() {
		if (!this.positions && this.creep.room.name !== this.creep.memory.config.targetRoom) {
			const flag = Game.flags[this.creep.memory.config.targetRoom];
			if (!!flag && !!flag.pos) {
				this.moveTo(flag.pos);
				return;
			}
			console.log("WARFARE NON FLAG MOVE");
		}
		if (!this.moveUsingPositions()) {
			let target: Creep | Structure;
			if (!this.creep.memory.target) {
				target = this.findMeleeTarget(this.sourceKeeperDuty) || undefined;
				if (!!target) {
					this.creep.memory.target = target.id;
					delete this.creep.memory.targetPath;
				} else {
					delete this.creep.memory.target;
					delete this.creep.memory.targetPath;
				}
			} else {
				target = Game.getObjectById<Creep>(this.creep.memory.target);
				if (!target) { // target died
					target = this.findMeleeTarget(this.sourceKeeperDuty);
					if (!!target) {
						this.creep.memory.target = target.id;
						delete this.creep.memory.targetPath;
					} else {
						delete this.creep.memory.target;
						delete this.creep.memory.targetPath;
					}
				}
			}

			// Otherwise, use a pathFinder path to get there.
			if (!!target && !!this.creep.memory.target && target.id === this.creep.memory.target) {
				if (!this.creep.pos.isNearTo(target.pos)) { // move closer if we're out of ATTACK range.
					this.moveTo(target.pos);
				}
			} else {
				if (this.sourceKeeperDuty) {
					const lairs = this.creep.room.groupedStructures[STRUCTURE_KEEPER_LAIR].filter(
						(s: StructureKeeperLair) => s.ticksToSpawn < 50
						&& (s.pos.findInRange(this.creep.room.sources, 5).length > 0)
					);
					if (lairs.length > 0) {
						if (!this.creep.pos.inRangeTo(lairs[0].pos, 1)) {
							this.moveTo([{pos: lairs[0].pos, range: 1}]);
						} else {
							// this.creep.cancelOrder("move");
							if (_.random(0, 10) === 1) {
								this.creep.say("Come out!", true);
							}
						}
					} else {
						delete this.creep.memory.targetPath;
						this.waitAtFlag(this.creep.memory.config.targetRoom);
					}
				} else {
					delete this.creep.memory.targetPath;
					this.waitAtFlag(this.creep.memory.config.targetRoom);
				}
			}
		}
	}
	public action(): boolean {
		if (this.attack()) {
			this.heal();
			this.move();
		}
		return true;
	}
}
