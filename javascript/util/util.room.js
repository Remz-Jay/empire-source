var _ = require('lodash');

function UtilRoom() {
	this.roomNames = [];
	this.costMatrices = {};
	this.creepMatrices = {};
	this.rooms = Game.rooms;
	this.creepMatricesStoredForTick = null;
	this.loadRooms();
	this.roomConfig = {
		W7N44: [
			{x:27, y:30, w:20} // container next to extension, keep free for mule to deliver energy.
		],
		W6N42: []
	};

	this.getFirstRoom = function () {
		return this.rooms[this.roomNames[0]];
	};

	this.getRoomByName = function (roomName) {
		return (this.rooms.hasOwnProperty(roomName)) ? this.rooms[roomName] : undefined;
	};

	this.getCostMatrix = function (room) {
		if (undefined == room) return undefined;
		return (this.costMatrices.hasOwnProperty(room.name)) ? this.costMatrices[room.name] : undefined;
	};
	this.setCostMatrix = function (room, costMatrix) {
		this.costMatrices[room.name] = costMatrix;
	};
	this.getCreepMatrix = function (room) {
		if (!!this.creepMatricesStoredForTick && this.creepMatricesStoredForTick == Game.time) {
			return (this.creepMatrices.hasOwnProperty(room.name)) ? this.creepMatrices[room.name] : undefined;
		} else {
			// new tick, new chances
			if (!!this.creepMatricesStoredForTick) {
				this.expireCreepMatrices();
			}
			this.creepMatricesStoredForTick = Game.time;

		}
	};
	this.setCreepMatrix = function (room, costMatrix) {
		this.creepMatrices[room.name] = costMatrix;
	};
	this.expireCreepMatrices = function () {
		console.log('Expiring creepMatrices for tick ' + this.creepMatricesStoredForTick);
		this.creepMatrices = {};
	};

	this.getCreepMatrixForRoom = function (roomName) {
		try {
			let room = this.getRoomByName(roomName);
			let creepMatrix = this.getCreepMatrix(room);
			if (creepMatrix != undefined) {
				console.log("Returning existing CreepMatrix for room " + roomName);
				return creepMatrix;
			} else {
				let costMatrix = this.getCostMatrixForRoom(roomName);
				// Avoid creeps in the room
				room.find(FIND_CREEPS).forEach(function (creep) {
					costMatrix.set(creep.pos.x, creep.pos.y, 10);
				});
				console.log("Returning NEW Creepmatrix for room " + roomName);
				this.setCreepMatrix(room, costMatrix);
				return costMatrix;
			}
		} catch (e) {
			console.log(JSON.stringify(e), "Util.Room.getCreepMatrixForRoom", roomName);
			return new PathFinder.CostMatrix();
		}

	};

	this.getCostMatrixForRoom = function (roomName) {
		try {
			let room = this.getRoomByName(roomName);
			let costMatrix = this.getCostMatrix(room);
			if (costMatrix != undefined) {
				console.log("returning existing matrix");
				return costMatrix;
			} else {
				let costs = new PathFinder.CostMatrix();
				room.find(FIND_STRUCTURES).forEach(function (structure) {
					if (structure.structureType === STRUCTURE_ROAD) {
						// Favor roads over plain tiles
						costs.set(structure.pos.x, structure.pos.y, 1);
					} else if (structure.structureType !== STRUCTURE_CONTAINER &&
						(structure.structureType !== STRUCTURE_RAMPART)) {
						// Can't walk through non-walkable buildings
						costs.set(structure.pos.x, structure.pos.y, 0xff);
					}
				});
				_.each(this.roomConfig[roomName], obj => costs.set(obj.x, obj.y, obj.w));
				console.log("returning new matrix");
				this.setCostMatrix(room, costs);
				return costs;
			}
		} catch (e) {
			console.log(JSON.stringify(e), "Util.Room.getCostMatrixForRoom", roomName);
			return new PathFinder.CostMatrix();
		}

	}
}
UtilRoom.prototype.loadRooms = function () {
	this.rooms = Game.rooms;
	for (let roomName in this.rooms) {
		if (this.rooms.hasOwnProperty(roomName)) {
			this.roomNames.push(roomName);
		}
	}
	let count = _.size(this.rooms);
	console.log(count + " rooms found.");
};

module.exports = UtilRoom;