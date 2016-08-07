import * as Config from "./../../config/config";
import * as SpawnManager from "./../spawns/spawnManager";
import CreepAction from "./creepAction";
import CreepGovernor, {CreepConfiguration, CreepGovernorConstructor} from "./creepGovernor";
import Harvester from "./roles/harvester";
import Builder from "./roles/builder";
import HarvesterGovernor from "./governors/harvester";
import BuilderGovernor from "./governors/builder";
import Upgrader from "./roles/upgrader";
import UpgraderGovernor from "./governors/upgrader";
import LinkerGovernor from "./governors/linker";
import MuleGovernor from "./governors/mule";
import Mule from "./roles/mule";

export let creeps: { [creepName: string]: Creep };
export let creepNames: string[] = [];
export let creepCount: number;

let roles: {[key: string]: typeof CreepAction } = {
	Builder: Builder,
	Harvester: Harvester,
	Upgrader: Upgrader,
	Mule: Mule,
};

// TODO: Add claim, healer, remote*, repairbot, scout
let governors: {[key: string]: typeof CreepGovernor } = {
	BuilderGovernor: BuilderGovernor,
	HarvesterGovernor: HarvesterGovernor,
	UpgraderGovernor: UpgraderGovernor,
	LinkerGovernor: LinkerGovernor,
	MuleGovernor: MuleGovernor,
};

export function loadCreeps(): void {
	creeps = Game.creeps;
	creepCount = _.size(creeps);

	_loadCreepNames();

	if (Config.DEBUG) {
		console.log(creepCount + " creeps found in the playground.");
	}
}
export function createCreep(config: CreepConfiguration): string|number {
	let spawn = SpawnManager.getFirstSpawn();
	let status: number | string = spawn.canCreateCreep(config.body, config.name);
	if (status === OK) {
		status = spawn.createCreep(config.body, config.name, config.properties);

		if (Config.VERBOSE) {
			if (_.isNumber(status)) {
				console.log(`Unable to create ${config.properties.role} Creep (${status})`);
			} else {
				console.log(`Started creating new ${config.properties.role} Creep ${status}`);
			}
		}
	}
	return status;
}

export function governCreeps(room: Room): void {
	let isSpawning = false;
	let prioritizedGovernors = _.sortBy(governors, "PRIORITY");
	for (let index in prioritizedGovernors) {
		if (room.controller.level >= prioritizedGovernors[index].MINRCL) {
			let governor: CreepGovernor = new prioritizedGovernors[index](room);
			let creepRole: string = prioritizedGovernors[index].ROLE;
			let creepsInRole: Creep[] = _.filter(Game.creeps, (creep: Creep) => creep.memory.role === creepRole
			&& creep.memory.homeRoom === room.name);
			let numCreeps: number = creepsInRole.length;
			_.each(creepsInRole, function (creep: Creep) {
				if (!creep.spawning) {
					let role: CreepAction = <CreepAction> new roles[<any> creepRole]();
					role.setCreep(<Creep> creep);
					role.setGovernor(governor);
					role.action();
				}
			}, this);

			if (Config.VERBOSE) {
				console.log(`${creepRole}: ${numCreeps}/${governor.getCreepLimit()}`);
			}
			if (numCreeps < governor.getCreepLimit() && !isSpawning) {
				let config: CreepConfiguration = governor.getCreepConfig();
				if (!_.isNumber(this.createCreep(config))) {
					isSpawning = true;
				}
			} else if (numCreeps > governor.getCreepLimit()) {
				// TODO: Deconstruct excess creep.
			}
		}
	}
}

function _loadCreepNames(): void {
	for (let creepName in creeps) {
		if (creeps.hasOwnProperty(creepName)) {
			creepNames.push(creepName);
		}
	}
}
