import WarArcher from "../../roles/wararcher";
import Dismantler from "../../roles/dismantler";
import Healer from "../../roles/healer";

export default class AssaultManager {
	private rooms: Room[] = [];
	private squads: SquadConfig[];
	private color: number;
	private secondaryColor: number;
	private readonly classes: any = {
		WarArcher: WarArcher,
		Dismantler: Dismantler,
		Healer: Healer,
	};
	constructor() {
		this.loadFromMemory();
		this.rooms = _.filter(Game.rooms, (r: Room) => !!r.my);
	}
/*	public govern() {
		this.rooms.forEach((r: Room) => {
			if (!!Game.flags[`A_${r.name}`]) {
				this.color = Game.flags[`A_${r.name}`].color;
				this.secondaryColor = Game.flags[`A_${r.name}`].secondaryColor;
				const creeps = this.loadCreeps()
			} else {

			}
		});
		if (_.keys(this.powerBanks).length > 0) {
			if (this.squads.length < this.maxActiveSquads) {
				this.dispatchPowerSquad();
			}
			if (this.squads.length > 0) {
				this.squads.forEach((squad: SquadConfig) => {
					this.manageSquad(squad);
				});
			}
		} else {
			console.log(`[PowerManager] No powerBanks found.`);
		}
		this.saveToMemory();
	}*/
	private loadFromMemory() {
		_.defaults(Memory.assaultManager, {
			squads: [],
		});
		this.squads = Memory.assaultManager.squads;
	}/*
	private saveToMemory() {
		Memory.assaultManager.squads = this.squads;
	}
	private loadCreeps(sq: any): Creep[] {
		let creeps: Creep[] = [];
		_.forEach(sq.roles, (role: SquadRole) => {
			creeps = creeps.concat(_.filter(_.get(global.tickCache.rolesByRoom, `${role.role}.${sq.source}`, []),
				(c: Creep) => c.memory.config.targetRoom === sq.target.pos.roomName
			));
		});
		return creeps;
	}
	private createCreep(homeRoom: Room, creepConfig: CreepConfiguration): string|number {
		const spawn = homeRoom.getFreeSpawn();
		let status: number | string = spawn.canCreateCreep(creepConfig.body, creepConfig.name);
		if (status === OK) {
			status = spawn.createCreepWhenIdle(creepConfig.body, creepConfig.name, creepConfig.properties);
			if (global.VERBOSE) {
				if (_.isNumber(status) && status !== ERR_BUSY) {
					console.log(`[PowerManager] Unable to create ${creepConfig.properties.role} Creep (${global.translateErrorCode(status)})`);
				} else {
					console.log(`[PowerManager] Started creating new ${creepConfig.properties.role} Creep ${status}`);
				}
			}
		}
		return status;
	}
	private manageSquad(squad: SquadConfig): boolean {
		return false;
	}*/
}