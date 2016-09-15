import CreepAction from "./creepAction";
import CreepGovernor from "./creepGovernor";
import Harvester from "./roles/harvester";
import Builder from "./roles/builder";
import HarvesterGovernor from "./governors/harvester";
import BuilderGovernor from "./governors/builder";
import Upgrader from "./roles/upgrader";
import UpgraderGovernor from "./governors/upgrader";
import LinkerGovernor from "./governors/linker";
import MuleGovernor from "./governors/mule";
import Mule from "./roles/mule";
import Linker from "./roles/linker";
import Repair from "./roles/repair";
import RepairGovernor from "./governors/repair";
import Miner from "./roles/miner";
import MinerGovernor from "./governors/miner";
import Scientist from "./roles/scientist";
import ScientistGovernor from "./governors/scientist";

let roles: {[key: string]: typeof CreepAction } = {
	Builder: Builder,
	Harvester: Harvester,
	Upgrader: Upgrader,
	Mule: Mule,
	Linker: Linker,
	Repair: Repair,
	Miner: Miner,
	Scientist: Scientist,
};

let governors: {[key: string]: typeof CreepGovernor } = {
	BuilderGovernor: BuilderGovernor,
	HarvesterGovernor: HarvesterGovernor,
	UpgraderGovernor: UpgraderGovernor,
	LinkerGovernor: LinkerGovernor,
	MuleGovernor: MuleGovernor,
	RepairGovernor: RepairGovernor,
	MinerGovernor: MinerGovernor,
	ScientistGovernor: ScientistGovernor,
};

export function createCreep(room: Room, config: CreepConfiguration): string|number {
	let spawn = room.getFreeSpawn();
	if (!!spawn) {
		let status: number | string = spawn.canCreateCreep(config.body, config.name);
		if (status === OK) {
			status = spawn.createCreepWhenIdle(config.body, config.name, config.properties);
			if (global.VERBOSE) {
				if (_.isNumber(status)) {
					console.log(`Unable to create ${config.properties.role} Creep (${status})`);
				} else {
					console.log(`Started creating new ${config.properties.role} Creep ${status}`);
				}
			}
		}
		return status;
	} else {
		return ERR_BUSY;
	}
}

export function governCreeps(room: Room): CreepStats {
	let CpuRoles = 0;
	let CpuCreeps = 0;
	let CpuPerRole: any = {};
	let isSpawning = false;
	let prioritizedGovernors = _.sortBy(governors, "PRIORITY");
	for (let index in prioritizedGovernors) {
		if (room.controller.level >= prioritizedGovernors[index].MINRCL // Skip roles that aren't meant for this RCL
			&& (
				prioritizedGovernors[index].PRIORITY < global.PRIORITY_TRESHOLD // Always execute roles that have priority
				|| Game.cpu.bucket > global.BUCKET_MIN // Execute auxiliary roles when bucket allows for it
				// || Game.cpu.getUsed() < Game.cpu.limit // Execute auxiliary roles when we have spare cycles this tick.
			)
		) {
			let CpuBeforeRoles = Game.cpu.getUsed();
			let governor: CreepGovernor = new prioritizedGovernors[index](room);
			let creepRole: string = prioritizedGovernors[index].ROLE;
			let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role.toUpperCase() === creepRole.toUpperCase()
			&& creep.memory.homeRoom === room.name);
			let numCreeps: number = creepsInRole.length;
			let creepLimit: number = governor.getCreepLimit();

			if (global.CREEPSTATS) {
				let body: string[] = governor.getBody();
				let requiredEnergy: number = CreepGovernor.calculateRequiredEnergy(body);
				console.log(
					_.padLeft(creepRole, 9) + ":\t" + numCreeps
					+ " (max:" + creepLimit
					+ ")\t\t(" + _.padLeft(requiredEnergy.toString(), 4)
					+ ") [" + body
					+ "]"
				);
			}
			if (numCreeps < creepLimit && !isSpawning && room.mySpawns.length > 0) {
				let config: CreepConfiguration = governor.getCreepConfig();
				if (!_.isNumber(this.createCreep(room, config))) {
					isSpawning = true;
				} else if (governor.emergency) {
					isSpawning = true; // prevent spawning of other roles until the emergency is over.
				}
			}
			CpuRoles += (Game.cpu.getUsed() - CpuBeforeRoles);

			let CpuBeforeCreeps = Game.cpu.getUsed();
			_.each(creepsInRole, function (creep: Creep) {
				if (!creep.spawning) {
					let role: CreepAction = <CreepAction> new roles[<any> creepRole]();
					try {
						role.setCreep(<Creep> creep);
						role.setGovernor(governor);
						role.action();
					} catch (e) {
						console.log(`ERROR :: ${creepRole}: ${creep.name} ${creep.room.name} ${e.message}`);
					}
				}
			}, this);
			let temp = Game.cpu.getUsed() - CpuBeforeCreeps;
			CpuPerRole[creepRole] = {numCreeps: creepsInRole.length, cpu: temp};
			CpuCreeps += temp;
		}
	}
	return {roles: CpuRoles, creeps: CpuCreeps, perRole: CpuPerRole};
}
