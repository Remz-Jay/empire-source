//Game.spawns['Spawn1'].createCreep( [WORK, CARRY, MOVE], 'Harvester1' );
//Game.spawns['Spawn1'].createCreep( [WORK, CARRY, MOVE], 'Builder1',{ role: 'builder' } );
//Game.creeps['Harvester1'].suicide()
//http://support.screeps.com/hc/en-us/articles/205990342-StructureSpawn#renewCreep
//Game.spawns['Spawn1'].room.createConstructionSite( 23, 22, STRUCTURE_TOWER );

var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');

module.exports.loop = function () {

    var tower = Game.getObjectById('42a5c224991644d3c69d69e5');
    if(tower) {
        var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => structure.hits < structure.hitsMax
    });
        if(closestDamagedStructure) {
            tower.repair(closestDamagedStructure);
        }

        var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if(closestHostile) {
            tower.attack(closestHostile);
        }
    }

    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }

    var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
    console.log('Harvesters: ' + harvesters.length);
    var upgraders = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
    console.log('Upgraders: ' + upgraders.length);
    var builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'builder');
    console.log('Builders: ' + builders.length);

    var building = false;
    if(!building && harvesters.length < 5) {
        var newName = Game.spawns['Bastion'].createCreep([WORK,CARRY,MOVE], undefined, {role: 'harvester'});
        if(_.isString(newName)) {
            console.log('Spawning new harvester: ' + newName);
            building = true;
        } else {
            console.log('Unable to spawn harvester:' + result);
        }
    }
    if(!building && upgraders.length < 1) {
        var newName = Game.spawns['Bastion'].createCreep([WORK,CARRY,MOVE], undefined, {role: 'upgrader'});
        if(_.isString(newName)) {
            console.log('Spawning new upgrader: ' + newName);
            building = true;
        } else {
            console.log('Unable to spawn upgrader:' + result);
        }
    }
    if(!building && builders.length < 5) {
        var newName = Game.spawns['Bastion'].createCreep([WORK,CARRY,MOVE], undefined, {role: 'builder'});
        if(_.isString(newName)) {
            console.log('Spawning new builder: ' + newName);
            building = true;
        } else {
            console.log('Unable to spawn builder:' + result);
        }
    }

    for(var name in Game.rooms) {
        console.log('Room "'+name+'" has '+Game.rooms[name].energyAvailable+' energy');
    }

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        }
        if(creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
        if(creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        }
    }
}