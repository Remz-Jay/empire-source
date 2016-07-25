//Game.spawns['Spawn1'].createCreep( [WORK, CARRY, MOVE], 'Harvester1' );
//Game.spawns['Spawn1'].createCreep( [WORK, CARRY, MOVE], 'Builder1',{ role: 'builder' } );
//Game.creeps['Harvester1'].suicide()
//http://support.screeps.com/hc/en-us/articles/205990342-StructureSpawn#renewCreep
//Game.spawns['Spawn1'].room.createConstructionSite( 23, 22, STRUCTURE_TOWER );

var roles = {
    harvester: require('role.harvester'),
    repairbot: require('role.repairbot'),
    builder: require ('role.builder'),
    upgrader: require('role.upgrader')
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

    for(var name in Game.rooms) {
        var room = Game.rooms[name];
        console.log('Room "' + room.name + '" has ' + room.energyAvailable + ' energy');
        var building = false;
        for(var index in roles) {
            var role = roles[index];
            var x = _.filter(Game.creeps, (creep) => creep.memory.role == role.role);
            console.log(role.role + ': ' + x.length + ' (max:' + role.max() + ')');
            if(!building && x.length < role.max()) {
                var spawn = room.find(FIND_MY_SPAWNS)[0];
                var body = role.getBody(room.energyCapacityAvailable);
                if(spawn.canCreateCreep(body) == OK) {
                    var newName = spawn.createCreep(body, undefined, {role: role.role});
                    if (_.isString(newName)) {
                        console.log('Spawning new ' + role.role + ': ' + newName + ' at spawn ' + spawn.name);
                        building = true;
                    } else {
                        console.log('Unable to spawn ' + role.role + ': ' + newName + ' at spawn ' + spawn.name);
                    }
                } else {
                    console.log('Not enough energy to create ' + role.role + ' at spawn ' + spawn.name + spawn.canCreateCreep(body));
                    building = true; //skip all other attempts;
                }
            }
        }
    }

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        for(var index in roles) {
            var role = roles[index];
            if(creep.memory.role == role.role) {
                role.run(creep);
            }
        }
    }
    console.log('End of tick ' + Game.time +
        '(Stats: ' + Game.gcl.level + '/' + Game.gcl.progress + ' : '
        + Math.ceil(Game.cpu.getUsed())+'/'+Game.cpu.limit+'('+Game.cpu.tickLimit+'/'+Game.cpu.bucket+'))');
};