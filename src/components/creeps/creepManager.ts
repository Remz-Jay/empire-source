import CreepAction from "./creepAction";
import Harvester from "./roles/harvester";
import Builder from "./roles/builder";
import Upgrader from "./roles/upgrader";
import Mule from "./roles/mule";
import Linker from "./roles/linker";
// import Repair from "./roles/repair";
import Miner from "./roles/miner";
import Scientist from "./roles/scientist";
import Biter from "./roles/biter";
// import Dismantler from "./roles/dismantler";

const roles: {[key: string]: typeof CreepAction } = {
	Builder: Builder,
	Harvester: Harvester,
	Upgrader: Upgrader,
	Mule: Mule,
	Linker: Linker,
	// Repair: Repair,
	Miner: Miner,
	Scientist: Scientist,
	Biter: Biter,
	// Dismantler: Dismantler,
};

export function createCreep(room: Room, config: CreepConfiguration): string|number {
	const spawn = room.getFreeSpawn();
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

export function governCreeps(room: Room) {
	let isSpawning = false;
	const prioritizedRoles = _.sortBy(roles, "PRIORITY");
	for (const index in prioritizedRoles) {
		if (room.controller.level >= prioritizedRoles[index].MINRCL // Skip roles that aren't meant for this RCL
			&& (
				prioritizedRoles[index].PRIORITY < global.PRIORITY_TRESHOLD // Always execute roles that have priority
				|| Game.cpu.bucket > global.BUCKET_MIN // Execute auxiliary roles when bucket allows for it
			)
		) {
			const creepRole: string = prioritizedRoles[index].ROLE;
			const creepsInRole: Creep[] = _.get(global.tickCache.rolesByRoom, `${creepRole}.${room.name}`, []);
			const numCreeps: number = creepsInRole.length;
			const creepLimit: number = prioritizedRoles[index].getCreepLimit(room);

			if (global.CREEPSTATS) {
				const body: string[] = prioritizedRoles[index].getBody(room);
				const requiredEnergy: number = global.calculateRequiredEnergy(body);
				console.log(
					_.padLeft(creepRole, 9) + ":\t" + numCreeps
					+ " (max:" + creepLimit
					+ ")\t\t(" + _.padLeft(requiredEnergy.toString(), 4)
					+ ") [" + body
					+ "]"
				);
			}
			if (numCreeps < creepLimit && !isSpawning && room.mySpawns.length > 0) {
				const config: CreepConfiguration = prioritizedRoles[index].getCreepConfig(room);
				if (!_.isNumber(this.createCreep(room, config))) {
					isSpawning = true;
				} else if (prioritizedRoles[index].emergency) {
					isSpawning = true; // prevent spawning of other roles until the emergency is over.
				}
			}
			if (numCreeps > 0) {
				const role: CreepAction = <CreepAction> new prioritizedRoles[index]();
				_.each(creepsInRole, function (creep: Creep) {
					if (!creep.spawning) {
						try {
							role.setCreep(<Creep> creep);
							role.action();
						} catch (e) {
							console.log(`ERROR :: ${creepRole}: ${creep.name} ${creep.room.name} ${e.message}`);
						}
					}
				}, this);
			}
		}
	}
}
