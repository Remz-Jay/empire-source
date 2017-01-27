import WarfareCreepAction from "../../packages/warfare/warfareCreepAction";
import PowerHarvester from "./roles/powerHarvester";
import PowerHealer from "./roles/powerHealer";
import PowerMule from "./roles/powerMule";

/**
 * 17M(boosted) 33 A and 21 M 21 H (boosted)
 * heals 504, damages 990 (495 reflected) / tick
 * RESOURCE_LEMERGIUM_OXIDE : { color : COLOR_GREEN , secondaryColor : COLOR_YELLOW }, // 	+100% heal and rangedHeal effectiveness
 * RESOURCE_ZYNTHIUM_OXIDE : { color : COLOR_ORANGE , secondaryColor : COLOR_YELLOW }, // +100% fatigue decrease speed
 */
export default class PowerManager {
	public static readonly ticksToPreSpawn = 310;
	public static readonly damagePerTick = 990;
	public static readonly muleCapacity = 1250;
	private rooms: Room[] = [];
	private powerBanks: {[id: string]: PowerBankMemory};
	private squads: SquadConfig[];
	private readonly dispatchThreshold: number = 3500;
	private readonly maxActiveSquads: number = 2;
	private readonly classes: any = {
		PowerHarvester: PowerHarvester,
		PowerHealer: PowerHealer,
		PowerMule: PowerMule,
	};
	constructor() {
		this.loadFromMemory();
		// this.rooms = _.filter(Game.rooms, (r: Room) => !!r.my && r.controller.level === 8);
		let roomNames = ["W6N42", "W6N49", "W9N44", "W2N46"];
		roomNames.forEach((n: string) => this.rooms.push(Game.rooms[n]));
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
		const creeps = _.groupBy(this.loadCreeps(squad), "memory.role");
		const targetRoom = Game.rooms[squad.target.pos.roomName];

		let bank: StructurePowerBank;
		if (!!targetRoom) {
			// we have vision of the target's Room
			bank = new RoomPosition(squad.target.pos.x, squad.target.pos.y, squad.target.pos.roomName).lookFor<StructurePowerBank>(LOOK_STRUCTURES).shift();
			if (!!bank) {
				console.log(`PowerBank ID: ${bank.id}. Ticks to go: ${_.round(bank.hits / PowerManager.damagePerTick)}/${bank.ticksToDecay}.`);
				const numMulesRequired = _.ceil(bank.power / PowerManager.muleCapacity);
				const timer = global.clamp(_.floor(numMulesRequired / 3), 1, 10) * PowerManager.ticksToPreSpawn;
				if (bank.hits <= PowerManager.damagePerTick * timer) {
					squad.roles = [
						{
							"role": "PowerHarvester",
							"maxCreeps": 1,
						},
						{
							"role": "PowerHealer",
							"maxCreeps": 1,
						},
						{
							"role": "PowerMule",
							"maxCreeps": numMulesRequired,
						},
					];
				}
			} else {
				console.log(`No PowerBank Found`);
				// kill the harvester and heal team six, they might be in the way.
				_.get(creeps, "PowerHarvester", []).forEach((c: Creep) => c.suicide());
				_.get(creeps, "PowerHealer", []).forEach((c: Creep) => c.suicide());
				squad.roles = [
					{
						"role": "PowerMule",
						"maxCreeps": 0,
					},
				];
				squad.missionComplete = true;
			}
		}
		_.forEach(squad.roles, (squadRole: SquadRole) => {
			const config: RemoteRoomConfig = {
				homeRoom: squad.source,
				targetRoom: squad.target.pos.roomName,
			};
			const homeRoom = Game.rooms[squad.source];
			const creepsInRole = _.get(creeps, `${squadRole.role}`, []);
			if (!!squad.missionComplete && squadRole.role === "PowerMule" && creepsInRole.length === 0) {
				// clean up any remaining creeps that might have been spawning while we cleaned last time before we remove this task from the loop
				_(this.loadCreeps(squad)).forEach((c: Creep) => c.suicide());
				this.squads = _.difference(this.squads, [squad]);
				return;
			}
			console.log("[PowerManager]", squadRole.role, squadRole.maxCreeps, squad.target.pos.roomName, homeRoom.name, creepsInRole.length);
			const roleCtor = this.classes[<string> squadRole.role];
			roleCtor.setConfig(config);
			const role: WarfareCreepAction = new roleCtor();
			_.forEach(creepsInRole, (c: Creep) => {
				if (!c.spawning) {
					let positions: RoomPosition[] = [];
					let rp = new RoomPosition(squad.target.pos.x, squad.target.pos.y, squad.target.pos.roomName);
					positions.push(rp);
					role.setCreep(<Creep> c, positions);
					role.action();
					if (!!bank && bank.hits > (PowerManager.ticksToPreSpawn * PowerManager.damagePerTick) // Check if the current gen is able to complete the job
						&& c.ticksToLive < PowerManager.ticksToPreSpawn
						&& (creepsInRole.length === squadRole.maxCreeps)
					) {
						// Do a preemptive spawn if this creep is about to expire.
						const status = this.createCreep(homeRoom, roleCtor.getCreepConfig(homeRoom));
						if (_.isNumber(status)) {
							console.log("[PowerManager] managePowerSquad.preempt-spawn", global.translateErrorCode(status), squadRole.role);
						} else {
							console.log("[PowerManager] managePowerSquad.preempt-spawn", status, squadRole.role);
						}
					}
				}
			});
			if (creepsInRole.length < squadRole.maxCreeps) {
				let creepConfig = roleCtor.getCreepConfig(homeRoom);
				const status = this.createCreep(homeRoom, creepConfig);
				if (_.isNumber(status) && status !== ERR_BUSY) {
					console.log("[PowerManager] managePowerSquad.spawn", global.translateErrorCode(status), squadRole.role, JSON.stringify(creepConfig));
				} else {
					console.log("[PowerManager] managePowerSquad.spawn", status, squadRole.role);
				}
			}
		});
		return false;
	}
	private dispatchPowerSquad(): boolean {
		this.rooms.filter((r: Room) => !!r.storage && r.storage.store.energy > 50000
		&& !_.find(this.squads, "source", r.name) && _.every(r.mySpawns, {"isBusy": false}))
		.forEach((r: Room) => {
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
							"role": "PowerHarvester",
							"maxCreeps": 1,
						},
						{
							"role": "PowerHealer",
							"maxCreeps": 1,
						},
					],
					target: closest,
					source: r.name,
				});
				Game.notify(`${Game.time} - Dispatching a powerSquad from ${r.name}. Target: ${closest.pos.roomName} at range ${distance}.`
					+ ` It has ${closest.power} power and decays in ${decay}.`);
			} else {
				console.log(`[PowerManager] Unfortunately, no powerBanks with decent TTL's were found in range.`);
			}
		});
		return false;
	}
}
