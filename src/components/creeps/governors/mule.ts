import {ICreepGovernor, default as CreepGovernor} from "../creepGovernor";

export default class MuleGovernor extends CreepGovernor implements ICreepGovernor {

	public static PRIORITY: number = global.PRIORITY_MULE;
	public static MINRCL: number = global.MINRCL_MULE;
	public static ROLE: string = "Mule";

	public bodyPart = [CARRY, CARRY, MOVE];
	public maxParts = 10;
	public maxCreeps = 2;
	public getCreepConfig(): CreepConfiguration {
		const bodyParts: string[] = this.getBody();
		const name: string = `${this.room.name}-${MuleGovernor.ROLE}-${global.time}`;
		const spawn = this.room.getFreeSpawn();
		const properties: CreepProperties = {
			homeRoom: this.room.name,
			role: MuleGovernor.ROLE,
			target_controller_id: this.room.controller.id,
			target_energy_source_id: spawn.id,
		};
		return {body: bodyParts, name: name, properties: properties};
	}

	public getBody(): string[] {
		let numParts: number;
		if (this.getNumberOfCreepsInRole() > 0 && !this.emergency) {
			numParts = _.floor((this.room.energyCapacityAvailable) / CreepGovernor.calculateRequiredEnergy(this.bodyPart));
		} else {
			numParts = _.floor((this.room.energyAvailable) / CreepGovernor.calculateRequiredEnergy(this.bodyPart));
		}
		numParts = global.clamp(numParts, 3, this.maxParts);
		let body: string[] = [];
		for (let i = 0; i < numParts; i++) {
			if (body.length + this.bodyPart.length <= 50) {
				body = body.concat(this.bodyPart);
			}
		}
		return CreepGovernor.sortBodyParts(body);
	}

	public getCreepLimit(): number {
		if (this.room.name === "W6N42") {
			++this.maxCreeps;
		}
		if (this.room.name === "W2N46") {
			return 2;
		}
		if (this.room.containers.length > 0) {
			if (this.getCreepsInRole().length < 1 || (this.room.energyInContainers + this.room.energyAvailable)  < (this.room.energyCapacityAvailable * 0.8)) {
				this.emergency = true;
				this.maxCreeps = 2;
			}
			return (this.room.controller.level < 5) ? 2 : this.maxCreeps;
		} else {
			return 0;
		}
	};

	public getBlackList(): string[] {
		if (!!global.targetBlackList[MuleGovernor.ROLE] && _.isArray(global.targetBlackList[MuleGovernor.ROLE])) {
			return global.targetBlackList[MuleGovernor.ROLE];
		} else {
			global.targetBlackList[MuleGovernor.ROLE] = [];
			const allMules: Creep[] = global.tickCache.roles[MuleGovernor.ROLE];
			allMules.forEach((c: Creep) => {
				if (!!c.memory.target) {
					global.targetBlackList[MuleGovernor.ROLE].push(c.memory.target);
				}
				if (!!c.memory.source) {
					global.targetBlackList[MuleGovernor.ROLE].push(c.memory.source);
				}
			});
			return global.targetBlackList[MuleGovernor.ROLE];
		}
	}
	public addToBlackList(targetId: string): void {
		if (!global.targetBlackList[MuleGovernor.ROLE]) {
			this.getBlackList();
		}
		global.targetBlackList[MuleGovernor.ROLE].push(targetId);
	}
}
