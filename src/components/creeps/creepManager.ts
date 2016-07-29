import * as Config from "./../../config/config";
import * as SpawnManager from "./../spawns/spawnManager";
import CreepAction from "./creepAction";
import CreepGovernor, {CreepConfiguration} from "./creepGovernor";
import Harvester from "./roles/harvester";
import Builder from "./roles/builder";
import HarvesterGovernor from "./governors/harvester";
import BuilderGovernor from "./governors/builder";
import Upgrader from "./roles/upgrader";
import UpgraderGovernor from "./governors/upgrader";

export let creeps: { [creepName: string]: Creep };
export let creepNames: string[] = [];
export let creepCount: number;

let roles: {[key: string]: typeof CreepAction } = {
	Builder: Builder,
	Harvester: Harvester,
	Upgrader: Upgrader,
};

let governors: {[key: string]: typeof CreepGovernor } = {
	BuilderGovernor: BuilderGovernor,
	HarvesterGovernor: HarvesterGovernor,
	UpgraderGovernor: UpgraderGovernor,
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
	let status: number | string = SpawnManager.getFirstSpawn().canCreateCreep(config.body, config.name);
	if (status === OK) {
		status = SpawnManager.getFirstSpawn().createCreep(config.body, config.name, config.properties);

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

export function governCreeps(): void {
	for (let index in governors) {
		let governor: CreepGovernor = new governors[index]();
		let creepsInRole: Creep[] = _.filter(Game.creeps, (creep) => creep.memory.role === governor.role);
		let numCreeps: number = creepsInRole.length;
		_.each(creepsInRole, function (creep: Creep) {
			if (!creep.spawning) {
				let role: CreepAction = <CreepAction> new roles[<any> governor.role]();
				role.setCreep(<Creep> creep);
				role.action();
			}
		}, this);

		if (Config.VERBOSE) {
			console.log(`${governor.role}: ${numCreeps}/${governor.getCreepLimit()}`);
		}
		if (numCreeps < governor.getCreepLimit()) {
			let config: CreepConfiguration = governor.getCreepConfig();
			this.createCreep(config);
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
