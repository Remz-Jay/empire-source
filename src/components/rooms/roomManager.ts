import * as Config from "./../../config/config";

export let rooms: { [roomName: string]: Room };
export let costMatrices: { [roomName: string]: CostMatrix };
export let roomNames: string[] = [];

export function loadRooms() {
	rooms = Game.rooms;
	costMatrices = {};
	_loadRoomNames();

	if (Config.VERBOSE) {
		let count = _.size(rooms);
		console.log(count + " rooms found.");
	}
}

export function getFirstRoom(): Room {
	return rooms[roomNames[0]];
}

export function getRoomByName(roomName: string): Room {
	return (rooms.hasOwnProperty(roomName)) ? rooms[roomName] : undefined;
}

function getCostMatrix(room: Room): CostMatrix {
	return (costMatrices.hasOwnProperty(room.name)) ? costMatrices[room.name] : undefined;
}
function setCostMatrix(room: Room, costMatrix: CostMatrix): void {
	costMatrices[room.name] = costMatrix;
}

function _loadRoomNames() {
	for (let roomName in rooms) {
		if (rooms.hasOwnProperty(roomName)) {
			roomNames.push(roomName);
		}
	}
}

export function getCostMatrixForRoom(roomName: string): CostMatrix {
	let room = getRoomByName(roomName);
	let costMatrix = getCostMatrix(room);
	if (costMatrix) {
		console.log("returning existing matrix");
		return <CostMatrix> costMatrix;
	} else {
		let costs = new PathFinder.CostMatrix();

		room.find(FIND_STRUCTURES).forEach(function (structure: Structure) {
			if (structure.structureType === STRUCTURE_ROAD) {
				// Favor roads over plain tiles
				costs.set(structure.pos.x, structure.pos.y, 1);
			} else if (structure.structureType !== STRUCTURE_CONTAINER &&
				(structure.structureType !== STRUCTURE_RAMPART)) {
				// Can't walk through non-walkable buildings
				costs.set(structure.pos.x, structure.pos.y, 0xff);
			}
		});
		console.log("returning new matrix");
		setCostMatrix(room, costs);
		return costs;
	}
}
