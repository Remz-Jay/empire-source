import * as WallManager from "../../../components/walls/wallManager";
import WarfareCreepAction from "../warfareCreepAction";

export interface IDismantler {
	action(): boolean;
	dismantleTarget(target: Structure): void;
	dismantle(): boolean;
	move(): boolean;
}

export default class Dismantler extends WarfareCreepAction implements IDismantler {
	public noTarget: boolean = false;
	public hasHealer: boolean = true;
	public hardPath: boolean = true;
	public boosts: string[] = [
		RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // +300% fatigue decrease speed
		RESOURCE_CATALYZED_ZYNTHIUM_ACID, // +300% dismantle effectiveness
	];

	public dismantleTarget(target: Structure): void {
		if (!this.creep.pos.isNearTo(target)) {
			this.creep.moveTo(target);
		} else {
			this.creep.dismantle(target);
			if (Game.time & 5) {
				this.creep.say("OM NOM", true);
			} else if (Game.time & 6) {
				this.creep.say("NOM!", true);
			}
		}
	}

	public dismantle(): boolean {
		if (!this.positions) {
			return false;
		}
		if (this.positionIterator < this.positions.length && this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
			let structures  = this.creep.room.lookForAt<Structure>(LOOK_STRUCTURES, this.positions[this.positionIterator]);
			if (structures.length) {
				this.creep.dismantle(structures[0]);
				return false;
			}
		} else if (!this.noTarget && this.positionIterator >= this.positions.length) {
			let target = this.findTargetStructure();
			if (!!target) {
				this.dismantleTarget(target);
				return false;
			} else if (!!this.creep.room.controller && !this.creep.room.controller.my) {
				WallManager.load(this.creep.room);
				target =  WallManager.getWeakestWall();
				this.dismantleTarget(target);
			}
		}
		return true;
	}

	public move(): boolean {
		if (!this.hasHealer && (!this.moveToHeal() || !this.moveToSafeRange() || !!this.creep.memory.waitForHealth)) {
			return;
		} else if (this.hasHealer && !this.checkTough()) {
			let closest = this.creep.pos.findClosestByRange(this.creep.room.myCreeps, {
				filter: (c: Creep) => c.id !== this.creep.id && c.getActiveBodyparts(HEAL) > 5,
			});
			if (!!closest && !this.creep.pos.isNearTo(closest)) {
				// get in range
				this.creep.moveTo(closest);
				return false;
			} else if (!!closest) {
				// stay in range
				this.creep.move(this.creep.pos.getDirectionTo(closest.pos));
				return false;
			}
		} else {
			if (!this.positions) {
				return false;
			}
			if (this.positionIterator < this.positions.length) {
				if (!this.creep.pos.isNearTo(this.positions[this.positionIterator])) {
					let pfg: PathFinderGoal = this.createPathFinderMap(<RoomPosition> this.positions[this.positionIterator], 1);
					this.moveTo(pfg);
				} else {
					this.positionIterator = ++this.creep.memory.positionIterator;
					return this.move();
				}
				return true;
			}
			return false;
		}
	}

	public action(): boolean {
		if (this.creep.room.name === this.creep.memory.homeRoom && !this.getBoosted()) {
			return false;
		}
		if (this.creep.hits === this.creep.hitsMax && !!this.creep.memory.waitForHealth) {
			delete this.creep.memory.waitForHealth;
		}
		if (!this.positions && this.creep.room.name !== this.creep.memory.config.targetRoom) {
				this.moveToTargetRoom();
		} else {
			if (this.dismantle()) {
				this.move();
			}
		}
		return true;
	}
}
