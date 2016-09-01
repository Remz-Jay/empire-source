import WarfareCreepAction from "../warfareCreepAction";

export default class Tank extends WarfareCreepAction {

	public boosts: string[] = [
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
	];
	private idle: boolean;

	public setCreep(creep: Creep, positions?: RoomPosition[]) {
		super.setCreep(creep, positions);
		this.idle = false;
	}

	public checkTough(): boolean {
		let tough: number = 0;
		_.each(this.creep.body, function (part: BodyPartDefinition) {
			if (part.type === TOUGH) {
				tough += part.hits;
			}
		});
		return (tough > 3500);
	}

	public moveToHeal(): boolean {
		if (!this.checkTough() || this.creep.memory.waitForHealth) {
			this.creep.memory.waitForHealth = true;
			this.creep.memory.positionIterator = this.positionIterator = (this.positions.length - 2);
			if (!this.creep.pos.isEqualTo(this.positions[this.positionIterator])) {
				let pfg: PathFinderGoal = this.createPathFinderMap(<RoomPosition> this.positions[this.positionIterator], 0);
				this.moveTo(pfg);
			}
			return false;
		}
		return true;
	}
	public moveToTarget(target: Creep | Structure) {
		if (!!target && !!this.creep.memory.target && target.id === this.creep.memory.target) {
			if (this.creep.pos.getRangeTo(target) > 1) { // move closer if we're out of RANGED_ATTACK range.
				if (!!this.creep.memory.targetPath) {
					if (!this.creep.memory.pathTTL || this.creep.memory.pathTTL < 5) {
						let path = this.deserializePathFinderPath(this.creep.memory.targetPath);
						this.creep.memory.pathTTL = (!!this.creep.memory.pathTTL) ? this.creep.memory.pathTTL + 1 : 1;
						this.moveByPath(path, target);
					} else {
						delete this.creep.memory.targetPath;
						this.creep.memory.pathTTL = 1;
						if (!this.findNewPath(target)) {
							this.creep.say("HALP!");
						}
					}
				} else {
					this.creep.memory.target = target.id;
					this.creep.memory.pathTTL = 1;
					delete this.creep.memory.targetPath;
					if (!this.findNewPath(target)) {
						this.creep.say("HALP!");
					}
				}
			} else {
				// Just sit there.
				delete this.creep.memory.targetPath;
			}
		} else {
			delete this.creep.memory.targetPath;
		}
	}
	public move() {
		if (!this.moveToHeal() || !!this.creep.memory.waitForHealth) {
			return;
		}
		this.moveUsingPositions();
		/*if (!this.moveUsingPositions() && this.idle) {
			let target: Creep | Structure = this.findTarget();
			if (!!target) {
				if (!this.creep.memory.target || target.id !== this.creep.memory.target) {
					delete this.creep.memory.targetPath;
					this.creep.memory.target = target.id;
				}
				this.moveToTarget(target);
			} else {
				target = this.findTargetStructure();
				if (!!target) {
					if (!this.creep.memory.target || target.id !== this.creep.memory.target) {
						delete this.creep.memory.targetPath;
						this.creep.memory.target = target.id;
					}
					this.moveToTarget(target);
				} else {
					this.creep.say("IDLE!");
				}
			}
		}*/
	}

	public action(): boolean {
		if (!this.creep.memory.updatedNotify) {
			this.creep.notifyWhenAttacked(false);
			this.creep.memory.updatedNotify = true;
		}
		if (this.creep.hits === this.creep.hitsMax && !!this.creep.memory.waitForHealth) {
			delete this.creep.memory.waitForHealth;
		}
		if (this.creep.room.name === this.creep.memory.homeRoom) {
			if (this.getBoosted()) {
				this.move();
			}
			return true;
		}
		this.move();
		return true;
	}
}
