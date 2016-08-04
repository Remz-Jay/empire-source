Room.prototype.getReservedRoom = function () {
	if (!!this.memory.reservedRoom && !!Game.rooms[this.memory.reservedRoom]) {
		return Game.rooms[this.memory.reservedRoom];
	} else {
		return undefined;
	}
};

Room.prototype.getReservedRoomName = function () {
	if (!!this.memory.reservedRoom) {
		return this.memory.reservedRoom;
	} else {
		return undefined;
	}
};

Room.prototype.setReservedRoom = function (roomName) {
	if (_.isString(roomName)) {
		this.memory.reservedRoom = roomName;
	} else if (roomName instanceof Room) {
		this.memory.reservedRoom = roomName.name;
	}
};

Room.prototype.setCostMatrix = function (costMatrix) {
	this.costMatrix = costMatrix;
};

Room.prototype.setCreepMatrix = function (costMatrix) {
	this.creepMatrix = costMatrix;
};

Room.prototype.expireMatrices = function () {
	delete this.creepMatrix;
	delete this.costMatrix;
};

Room.prototype.getCreepMatrix = function () {
	try {
		let creepMatrix = (!!this.creepMatrix) ? this.creepMatrix : undefined;
		if (!!creepMatrix) {
			//console.log("Returning existing CreepMatrix for room " + this.name);
			return creepMatrix;
		} else {
			let costMatrix = this.getCostMatrix();
			// Avoid creeps in the room
			this.find(FIND_CREEPS).forEach(function (creep) {
				costMatrix.set(creep.pos.x, creep.pos.y, 11);
			});
			//console.log("Returning NEW CreepMatrix for room " + this.name);
			this.setCreepMatrix(costMatrix);
			return costMatrix;
		}
	} catch (e) {
		console.log(JSON.stringify(e), "Room.Prototype.getCreepMatrix", this.name);
		return new PathFinder.CostMatrix();
	}

};

Room.prototype.getCostMatrix = function () {
	this.roomConfig = {
		W7N44: [
			{x:27, y:30, w:20} // container next to extension, keep free for mule to deliver energy.
		],
		W6N42: []
	};
	try {
		let costMatrix = (!!this.costMatrix) ? this.costMatrix : undefined;
		if (!!costMatrix) {
			//console.log("Returning existing CostMatrix for room " + this.name);
			return costMatrix;
		} else {
			let costs = new PathFinder.CostMatrix();
			this.find(FIND_STRUCTURES).forEach(function (structure) {
				if (structure.structureType === STRUCTURE_ROAD) {
					// Favor roads over plain tiles
					costs.set(structure.pos.x, structure.pos.y, 1);
				} else if (structure.structureType !== STRUCTURE_CONTAINER &&
					(structure.structureType !== STRUCTURE_RAMPART)) {
					// Can't walk through non-walkable buildings
					costs.set(structure.pos.x, structure.pos.y, 0xff);
				}
			});
			this.find(FIND_CONSTRUCTION_SITES).forEach(function (site) {
				costs.set(site.pos.x, site.pos.y, 0xff);
			});
			_.each(this.roomConfig[this.name], obj => costs.set(obj.x, obj.y, obj.w));
			//console.log("Returning NEW CostMatrix for room " + this.name);
			this.setCostMatrix(costs);
			return costs;
		}
	} catch (e) {
		console.log(JSON.stringify(e), "Room.prototype.getCostMatrix", this.name);
		return new PathFinder.CostMatrix();
	}
};