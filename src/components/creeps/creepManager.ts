import * as Config from "./../../config/config";
import * as SpawnManager from "./../spawns/spawnManager";
import CreepAction from "./creepAction";
import CreepGovernor from "./creepGovernor";
import Harvester from "./roles/harvester";
import Builder from "./roles/builder";
import HarvesterGovernor from "./governors/harvester";
import {CreepConfiguration} from "./creepGovernor";

export let creeps: { [creepName: string]: Creep };
export let creepNames: string[] = [];
export let creepCount: number;

let roles: Array<any> = [Harvester, Builder];
let governors: Array<any> = [HarvesterGovernor];

export function loadCreeps(): void {
  creeps = Game.creeps;
  creepCount = _.size(creeps);

  _loadCreepNames();

  if (Config.VERBOSE) {
    console.log(creepCount + " creeps found in the playground.");
  }
}
export function createCreep(config: CreepConfiguration): string|number {
  let status: number | string = SpawnManager.getFirstSpawn().canCreateCreep(config.body, config.name);
  if (status === OK) {
    status = SpawnManager.getFirstSpawn().createCreep(config.body, config.name, config.properties);

    if (Config.VERBOSE) {
      if (_.isNumber(status)) {
        console.log(`Unable to create ${config.properties["role"]} Creep (${status})`);
      } else {
        console.log(`Started creating new ${config.properties["role"]} Creep ${status}`);
      }
    }
  }
  return status;
}

export function goToWork(): void {
  for (let name in creeps) {
    let creep: Creep = creeps[name];
    for (let index in roles) {
      let role: CreepAction = new roles[index]();
      role.setCreep(creep);
      role.action();
    }
  }
}
export function governCreeps(): void {
  for (let index in governors) {
    let governor: CreepGovernor = new governors[index]();
    let numCreeps: number = _.filter(Game.creeps, (creep) => creep.memory.role === governor.role).length;
    if (Config.VERBOSE) {
      console.log(`${governor.role}: ${numCreeps}/${governor.getCreepLimit()}`);
    }
    if (numCreeps < governor.getCreepLimit()) {
      let config: CreepConfiguration = governor.getCreepConfig();
      this.createCreep(config);
    }
  }
}

export function harvestersGoToWork(): void {

  let harvesters: Harvester[] = [];
  _.forEach(this.creeps, function (creep: Creep, creepName: string) {
    if (creep.memory.role === "harvester") {
      let harvester = new Harvester();
      harvester.setCreep(creep);
      // Next move for harvester
      harvester.action();

      // Save harvester to collection
      harvesters.push(harvester);
    }
  });

  if (Config.VERBOSE) {
    console.log(harvesters.length + " harvesters reported on duty today!");
  }

}

/**
 * This should have some kind of load balancing. It's not useful to create
 * all the harvesters for all source points at the start.
 */
export function isHarvesterLimitFull(): boolean {
  return (Config.MAX_HARVESTERS_PER_SOURCE === this.creepCount);
}

function _loadCreepNames(): void {
  for (let creepName in creeps) {
    if (creeps.hasOwnProperty(creepName)) {
      creepNames.push(creepName);
    }
  }
}
