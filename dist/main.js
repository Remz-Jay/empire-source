//Game.spawns['Spawn1'].createCreep( [WORK, CARRY, MOVE], 'Harvester1' );
//Game.spawns['Spawn1'].createCreep( [WORK, CARRY, MOVE], 'Builder1',{ role: 'builder' } );
//Game.creeps['Harvester1'].suicide()
//http://support.screeps.com/hc/en-us/articles/205990342-StructureSpawn#renewCreep
//Game.spawns['Spawn1'].room.createConstructionSite( 23, 22, STRUCTURE_TOWER );
var _ = require('lodash');

var roles = {
    harvester: require('role.harvester'),
    mule: require('role.mule'),
    repairbot: require('role.repairbot'),
    upgrader: require('role.upgrader'),
    builder: require('role.builder'),
    scout: require('role.scout')
};

var classes = require('classLoader');
var utils = require('utilLoader');

module.exports.loop = function () {
    if (undefined == Memory.config.Rampart) {
        Memory.config.Rampart = {
            strength: 0
        }
    }
    Memory.flags = Game.flags;
    Memory.rooms = Game.rooms;
    Memory.spawns = Game.spawns;
    
    var tower = Game.getObjectById('579607f19de450ae22d2ed0b');
    if (tower) {
        var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => structure.hits < (structure.hitsMax * 0.8) &&
            structure.structureType != STRUCTURE_RAMPART &&
            structure.structureType != STRUCTURE_WALL
        });
        if (closestDamagedStructure) {
            tower.repair(closestDamagedStructure);
        }

        var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestHostile) {
            tower.attack(closestHostile);
        }
    }

    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }

    for (var name in Game.rooms) {
        var room = Game.rooms[name];

        var wall = new classes.Wall(room);
        wall.adjustStrength();

        var ramparts = new utils.Ramparts(room);
        ramparts.adjustStrength();

        console.log('Room "' + room.name + '" has ' + room.energyAvailable
            + '/' + room.energyCapacityAvailable + ' energy');

        var building = false;
        var spawn = room.find(FIND_MY_SPAWNS)[0]; //TODO: What if more spawns?
        if (undefined == spawn) {
        } else {
            for (var index in roles) {
                var role = new roles[index];
                if (undefined != role.role) {
                    var x = _.filter(Game.creeps, (creep) => creep.memory.role == role.role);

                    console.log(
                        _.padLeft(role.role, 9) + ':\t' + x.length
                        + ' (max:' + role.max(room.energyCapacityAvailable)
                        + ')\t\t(' + _.padLeft(utils.Creep.calculateRequiredEnergy(role.getBody(room.energyCapacityAvailable)), 4)
                        + ') [' + role.getBody(room.energyCapacityAvailable)
                        + ']'
                    );

                    if (!building && x.length < role.max(room.energyCapacityAvailable)) {
                        var body = role.getBody(room.energyCapacityAvailable);
                        var spawnState = spawn.canCreateCreep(body);
                        if (spawnState == OK) {
                            var newName = spawn.createCreep(body, undefined, {role: role.role});
                            if (_.isString(newName)) {
                                console.log('Spawning new ' + role.role + ': ' + newName + ' at spawn ' + spawn.name);
                                building = true;
                            } else {
                                console.log('Unable to spawn ' + role.role + ': ' + newName + ' at spawn ' + spawn.name);
                            }
                        } else {
                            building = true; //skip all other attempts;
                            switch (spawnState) {
                                case ERR_NOT_ENOUGH_ENERGY:
                                    console.log('Not enough energy to create ' + role.role + ' at spawn ' + spawn.name);
                                    break;
                                case ERR_BUSY:
                                    break;
                                default:
                                    console.log('Unhandled Spawn State while Spawning:' + spawnState);
                            }
                        }
                    }
                }
            }
        }
    }

    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        for (var index in roles) {
            var role = new roles[index];
            if (creep.memory.role == role.role) {
                if (!creep.spawning) role.run(creep);
            }
        }
    }
    var perc = _.floor(Game.gcl.progress / (Game.gcl.progressTotal / 100));
    console.log('End of tick ' + Game.time +
        '.\t(GCL: ' + Game.gcl.level + ' @ ' + perc + '%\tCPU: '
        + _.ceil(Game.cpu.getUsed()) + '/' + Game.cpu.limit
        + '\tRES:' + Game.cpu.tickLimit + '/' + Game.cpu.bucket + ')');
    console.log();
};