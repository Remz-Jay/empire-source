import CreepAction from "./creepAction";
import Harvester from "./roles/harvester";
import Builder from "./roles/builder";
import Upgrader from "./roles/upgrader";
import Mule from "./roles/mule";
import Linker from "./roles/linker";
import Repair from "./roles/repair2";
import Miner from "./roles/miner";
import Scientist from "./roles/scientist";
import Biter from "./roles/biter";
import Dismantler from "./roles/dismantler";

export default class CreepManager {
	private roles: typeof CreepAction[] = [
		Builder,
		Harvester,
		Upgrader,
		Mule,
		Linker,
		Repair,
		Miner,
		Scientist,
		Biter,
		Dismantler,
	];
	public constructor() {
		this.roles = _.sortBy(this.roles, "PRIORITY");
		if (!global.roleInstanceCache) {
			global.roleInstanceCache = {};
		}
	}
	public governCreeps(room: Room) {

		let isSpawning = false;
		for (const index in this.roles) {
			if (room.controller.level >= this.roles[index].MINRCL // Skip roles that aren't meant for this RCL
				&& (
					this.roles[index].PRIORITY < global.PRIORITY_TRESHOLD // Always execute roles that have priority
					|| Game.cpu.bucket > global.BUCKET_MIN // Execute auxiliary roles when bucket allows for it
				)
			) {
				const creepRole: string = this.roles[index].ROLE;
				const creepsInRole: Creep[] = _.get(global.tickCache.rolesByRoom, `${creepRole}.${room.name}`, []);
				const numCreeps: number = creepsInRole.length;
				const creepLimit: number = this.roles[index].getCreepLimit(room);

				if (numCreeps < creepLimit && !isSpawning && room.mySpawns.length > 0) {
					const config: CreepConfiguration = this.roles[index].getCreepConfig(room);
					if (!_.isNumber(this.createCreep(room, config))) {
						isSpawning = true;
					}
				}
				if (numCreeps > 0) {
					let role: CreepAction;
					if (!!global.roleInstanceCache[creepRole]) {
						role = <CreepAction> global.roleInstanceCache[creepRole];
					} else {
						role = global.roleInstanceCache[creepRole] = <CreepAction> new this.roles[index]();
					}
					creepsInRole.filter((c: Creep) => !c.spawning).forEach((c: Creep) => {
						try {
							role.setCreep(<Creep> c);
							role.action();
						} catch (e) {
							console.log(`ERROR ::`, c.name, c.room.name, e.stack);
						}
					});
				}
			}
		}
	}

	private createCreep(room: Room, config: CreepConfiguration): string|number {
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
}
