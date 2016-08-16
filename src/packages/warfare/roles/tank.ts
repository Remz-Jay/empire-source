import WarfareCreepAction from "../warfareCreepAction";

export default class Tank extends WarfareCreepAction {

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
		return (tough > 50) ? true : false;
	}

	public moveToHeal(): boolean {
		if (!this.checkTough()) {
			this.creep.memory.waitForHealth = true;
			this.creep.memory.positionIterator = this.positionIterator = (this.positions.length - 2);
			if (!this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
				this.moveTo(this.positions[this.positionIterator]);
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
		if (!this.moveUsingPositions() && this.idle) {
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
		}
	}

	public action(): boolean {
		if (!this.creep.memory.updatedNotify) {
			this.creep.notifyWhenAttacked(false);
			this.creep.memory.updatedNotify = true;
		}
		if (this.creep.hits === this.creep.hitsMax && !!this.creep.memory.waitForHealth) {
			delete this.creep.memory.waitForHealth;
			// this.creep.memory.positionIterator = this.positions.length - 1;
		}
		if (this.attack()) {
			if (this.attackEnemyStructure()) {
				if (this.attackPublicStructure()) {
					this.idle = true;
				}
			}
		}
		this.move();
		return true;
	}
}
