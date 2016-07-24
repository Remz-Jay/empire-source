//Game.spawns['Spawn1'].createCreep( [WORK, CARRY, MOVE], 'Harvester1' );
//Game.spawns['Spawn1'].createCreep( [WORK, CARRY, MOVE], 'Builder1',{ role: 'builder' } );
//Game.creeps['Harvester1'].suicide()
//http://support.screeps.com/hc/en-us/articles/205990342-StructureSpawn#renewCreep
//Game.spawns['Spawn1'].room.createConstructionSite( 23, 22, STRUCTURE_TOWER );

var roles = {
    harvester: require('role.harvester'),
    upgrader: require('role.upgrader'),
    builder: require ('role.builder')
};

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
    var building = false;
    for(var index in roles) {
        var role = roles[index];
        var x = _.filter(Game.creeps, (creep) => creep.memory.role == role.role);
        console.log(role.role + ': ' + x.length + ' (max:' + role.max + ')');
        if(!building && x.length < role.max) {
            var newName = Game.spawns['Bastion'].createCreep(role.body, undefined, {role: role.role});
            if(_.isString(newName)) {
                console.log('Spawning new ' + role.role + ': ' + newName);
                building = true;
            } else {
                console.log('Unable to spawn ' + role.role + ': ' + newName);
            }
        }
    }

    for(var name in Game.rooms) {
        console.log('Room "'+name+'" has '+Game.rooms[name].energyAvailable+' energy');
    }

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        switch(creep.memory.role) {
            case roles.harvester.role:
                roles.harvester.run(creep);
                break;
            case roles.upgrader.role:
                roles.upgrader.run(creep);
                break;
            case roles.builder.role:
                roles.builder.run(creep);
                break;
            default:
                console.log('Role' + creep.memory.role + ' not found!');
        }
    }
};