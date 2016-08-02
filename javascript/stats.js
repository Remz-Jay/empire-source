// Put in your main loop

if (Memory.stotz == undefined) {
    Memory.stotz = {}
}

var rooms = Game.rooms;
var spawns = Game.spawns;
for (let roomKey in rooms) {
    let room = Game.rooms[roomKey];
    var isMyRoom = (room.controller ? room.controller.my : 0);
    if (isMyRoom) {
        Memory.stotz['room.' + room.name + '.myRoom'] = 1;
        Memory.stotz['room.' + room.name + '.energyAvailable'] = room.energyAvailable;
        Memory.stotz['room.' + room.name + '.energyCapacityAvailable'] = room.energyCapacityAvailable;
        Memory.stotz['room.' + room.name + '.controllerProgress'] = room.controller.progress;
        Memory.stotz['room.' + room.name + '.controllerProgressTotal'] = room.controller.progressTotal;
        var stored = 0;
        var storedTotal = 0;

        if (room.storage) {
            stored = room.storage.store[RESOURCE_ENERGY];
            storedTotal = room.storage.storeCapacity[RESOURCE_ENERGY];
        } else {
            stored = 0;
            storedTotal = 0;
        }

        Memory.stotz['room.' + room.name + '.storedEnergy'] = stored;
    } else {
        Memory.stotz['room.' + room.name + '.myRoom'] = undefined;
    }
}
Memory.stotz['gcl.progress'] = Game.gcl.progress;
Memory.stotz['gcl.progressTotal'] = Game.gcl.progressTotal;
Memory.stotz['gcl.level'] = Game.gcl.level;
/**
for (let spawnKey in spawns) {
    let spawn = Game.spawns[spawnKey]
    Memory.stotz['spawn.' + spawn.name + '.defenderIndex'] = spawn.memory['defenderIndex']
}

 **/
//Memory.stotz['cpu.Init'] = global.CpuInit;
/**
 Memory.stotz['cpu.CreepManagers'] = creepManagement
 Memory.stotz['cpu.Towers'] = towersRunning
 Memory.stotz['cpu.Links'] = linksRunning
 Memory.stotz['cpu.SetupRoles'] = roleSetup
 Memory.stotz['cpu.Creeps'] = functionsExecutedFromCreeps
 Memory.stotz['cpu.SumProfiling'] = sumOfProfiller
 Memory.stotz['cpu.Start'] = startOfMain
 **/
Memory.stotz['cpu.bucket'] = Game.cpu.bucket;
Memory.stotz['cpu.limit'] = Game.cpu.limit;
//Memory.stotz['cpu.stats'] = Game.cpu.getUsed() - lastTick;
Memory.stotz['cpu.getUsed'] = Game.cpu.getUsed();
