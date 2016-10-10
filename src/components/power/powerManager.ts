import WarfareCreepAction from "../../packages/warfare/warfareCreepAction";
import PowerHarvesterGovernor from "./governors/powerHarvester";
import PowerHarvester from "./roles/powerHarvester";
import PowerHealerGovernor from "./governors/powerHealer";
import PowerHealer from "./roles/powerHealer";
import PowerMuleGovernor from "./governors/powerMule";
import PowerMule from "./roles/powerMule";

export default class PowerManager {
	private rooms: Room[];
	private powerBanks: {[id: string]: PowerBankMemory};
	private dispatchThreshold: number = 3000;
	private maxActiveSquads: number = 1;
	private squads: SquadConfig[];
	private classes: any = {
		PowerHarvesterGovernor: PowerHarvesterGovernor,
		PowerHarvester: PowerHarvester,
		PowerHealerGovernor: PowerHealerGovernor,
		PowerHealer: PowerHealer,
		PowerMuleGovernor: PowerMuleGovernor,
		PowerMule: PowerMule,
	};
	constructor() {
		this.loadFromMemory();
		// this.rooms = _.filter(Game.rooms, (r: Room) => !!r.controller && !!r.controller.my && r.controller.level === 8);
		let roomNames = ["W6N42", "W6N49"];
		this.rooms = [Game.rooms[roomNames[0]], Game.rooms[roomNames[1]]];
		this.powerBanks = Memory.powerBanks || {};
	}
	public govern() {
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
	}
	private loadFromMemory() {
		_.defaults(Memory.powerManager, {
			squads: [],
		});
		this.squads = Memory.powerManager.squads;
	}
	private saveToMemory() {
		Memory.powerManager.squads = this.squads;
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
				if (_.isNumber(status)) {
					console.log(`[PowerManager] Unable to create ${creepConfig.properties.role} Creep (${global.translateErrorCode(status)})`);
				} else {
					console.log(`[PowerManager] Started creating new ${creepConfig.properties.role} Creep ${status}`);
				}
			}
		}
		return status;
	}
	private manageSquad(squad: SquadConfig): boolean {
		const creeps = _.groupBy(this.loadCreeps(squad), "memory.role");
		_.forEach(squad.roles, (squadRole: SquadRole) => {
			const config: RemoteRoomConfig = {
				homeRoom: squad.source,
				targetRoom: squad.target.pos.roomName,
			};
			const homeRoom = Game.rooms[squad.source];
			const governor = new this.classes[<string> squadRole.governor](homeRoom, config);
			const creepsInRole = _.get(creeps, `${squadRole.role}`, []);
			console.log("[PowerManager]", squadRole.role, squadRole.maxCreeps, squad.target.pos.roomName, homeRoom.name, creepsInRole.length);
			const role: WarfareCreepAction = new this.classes[<string> squadRole.role]();
			_.forEach(creepsInRole, (c: Creep) => {
				if (!c.spawning) {
					const b = Game.cpu.getUsed();
					let positions: RoomPosition[] = [];
					let rp = new RoomPosition(squad.target.pos.x, squad.target.pos.y, squad.target.pos.roomName);
					positions.push(rp);
					role.setCreep(<Creep> c, positions);
					role.setGovernor(governor);
					role.action(b);
					if (c.ticksToLive < 200 && (creepsInRole.length === squadRole.maxCreeps)) {
						// Do a preemptive spawn if this creep is about to expire.
						const status = this.createCreep(homeRoom, governor.getCreepConfig());
						if (_.isNumber(status)) {
							console.log("[PowerManager] managePowerSquad.preempt-spawn", global.translateErrorCode(status), squadRole.role);
						} else {
							console.log("[PowerManager] managePowerSquad.preempt-spawn", status, squadRole.role);
						}
					}
					const a = Game.cpu.getUsed() - b;
					if (a > 2) {
						console.log(global.colorWrap(`[PowerManager] Creep ${c.name} (${c.memory.role} in ${c.room.name}) took ${_.round(a, 2)} to run.`, "Red"));
					}
				}
			});
			if (creepsInRole.length < squadRole.maxCreeps) {
				let creepConfig = governor.getCreepConfig();
				const status = this.createCreep(homeRoom, creepConfig);
				if (_.isNumber(status)) {
					console.log("[PowerManager] managePowerSquad.spawn", global.translateErrorCode(status), squadRole.role, JSON.stringify(creepConfig));
				} else {
					console.log("[PowerManager] managePowerSquad.spawn", status, squadRole.role);
				}
			}
		});
		return false;
	}
	private dispatchPowerSquad(): boolean {
		this.rooms.forEach((r: Room) => {
			let roomFree = _.every(r.mySpawns, {"isBusy": false});
			if (roomFree) {
				console.log(`[PowerManager] Room ${r.name} is capable of dispatching a PowerSquad`);
				let closest: PowerBankMemory;
				let distance: number = global.MAX_POWER_DISTANCE + 1;
				for (let id in this.powerBanks) {
					let pb = this.powerBanks[id];
					if (!pb.taken && (pb.indexed + pb.decay) - Game.time > this.dispatchThreshold) {
						let d = Game.map.getRoomLinearDistance(r.name, pb.pos.roomName);
						if (d < distance || (!!closest && d === distance && pb.power > closest.power)) {
							distance = d;
							closest = pb;
						}
					}
				}
				if (!!closest) {
					let decay = closest.decay - (Game.time - closest.indexed);
					console.log(`[PowerManager] The closest powerBank is in ${closest.pos.roomName} at range ${distance}.`
					+ ` It has ${closest.power} power and decays in ${decay}.`);
					closest.taken = true;
					this.squads.push({
						roles: [
							{
								"governor": "PowerHarvesterGovernor",
								"role": "PowerHarvester",
								"maxCreeps": 1,
							},
							{
								"governor": "PowerHealerGovernor",
								"role": "PowerHealer",
								"maxCreeps": 2,
							},
							{
								"governor": "PowerMuleGovernor",  // 1850 carry each
								"role": "PowerMule",
								"maxCreeps": 0,
							},
						],
						target: closest,
						source: r.name,
					});
				} else {
					console.log(`[PowerManager] Unfortunately, no powerBanks with decent TTL's were found in range.`);
				}
			}
		});
		return false;
	}
}
