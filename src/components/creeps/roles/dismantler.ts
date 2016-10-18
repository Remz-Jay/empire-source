import CreepAction from "../creepAction";

enum State {
	Dismantle,
	Deliver,
	Target,
	Move,
	Recycle,
}

export default class Dismantler extends CreepAction {

	private state: State;
	private target: Structure;

	public setCreep(creep: Creep) {
		super.setCreep(creep);
		this.state = _.get(this.creep.memory, "state", State.Target) as State;
		this.target = Game.getObjectById(_.get(this.creep.memory, "target", undefined) as string) as Structure;
		if (!this.target || this.state === State.Target) {
			this.target = this.findTarget();
			if (!!this.target) {
				this.state = State.Move;
			}
		}
		if (!this.target) {
			this.state = State.Target;
		}
	}

	public action(): boolean {
		switch (this.state) {
			case State.Move:
				this.move();
				break;
			case State.Deliver:
				this.deliver();
				break;
			case State.Dismantle:
				this.dismantle();
				break;
			case State.Target:
				// skip this tick
				break;
			case State.Recycle:
				this.recycle();
				break;
			default:
				console.log(`Unhandled state ${this.state} for Dismantler`);
				break;
		}
		this.saveToMemory();
		return true;
	}

	private recycle() {
		this.creep.say("Recycle");
		if (!this.creep.pos.isNearTo(this.target)) {
			this.moveTo(this.target.pos);
		} else {
			(this.target as StructureSpawn).recycleCreep(this.creep);
		}
	}

	private dismantle() {
		this.creep.say("Dismantle");
		if (this.creep.bagFull) {
			this.target = this.creep.room.storage;
			this.state = State.Move;
		} else {
			this.creep.dismantle(this.target);
		}
	}
	private move() {
		this.creep.say("Move");
		if (!this.creep.pos.isNearTo(this.target)) {
			this.moveTo(this.target.pos);
		} else {
			if (this.creep.bagEmpty) {
				this.state = State.Dismantle;
			} else {
				this.state = State.Deliver;
			}
		}
	}

	private deliver() {
		this.creep.say("Deliver");
		if (this.creep.bagEmpty) {
			this.state = State.Target;
		} else {
			this.creep.transfer(this.target, RESOURCE_ENERGY);
		}
	}

	private saveToMemory(): void {
		_.set(this.creep, "memory.state", this.state);
		_.set(this.creep, "memory.target", this.target.id);
	}

	private findTarget(): Structure {
		let flag = _(this.creep.room.flags).filter((f: Flag) => f.color === COLOR_YELLOW && f.secondaryColor === COLOR_ORANGE).first();
		if (!!flag) {
			let structure =  _(flag.pos.lookFor<Structure>(LOOK_STRUCTURES)).first();
			if (!!structure) {
				return structure;
			} else {
				flag.remove();
				return undefined;
			}
		} else {
			this.target = this.creep.room.getFreeSpawn();
			this.state = State.Recycle;
			return undefined;
		}
	}
}
