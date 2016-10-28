interface StructureObserver {
	roomIndex: {x: number, y: number};
	run(): void;
	getRoomName(x: number, y: number): string;
	getScanRoom(): string;
}

Object.defineProperty(StructureObserver.prototype, "roomIndex", {
	get: function () {
		if (!this.__roomIndex) {
			let indexGroups = this.room.name.match(/([EW])(\d+)([SN])(\d+)/);
			this.__roomIndex = {
				x: indexGroups[1] === "E" ? Number(indexGroups[2]) : -(Number(indexGroups[2]) + 1),
				y: indexGroups[3] === "S" ? Number(indexGroups[4]) : -(Number(indexGroups[4]) + 1),
			};
		}
		return this.__roomIndex;
	},
	enumerable: true,
	configurable: true,
});
Object.defineProperty(StructureObserver.prototype, "getRoomName", {
	value: function (x: number, y: number) {
		return (x < 0 ? "W" + (-x - 1) : "E" + x) + (y < 0 ? "N" + (-y - 1) : "S" + y);
	},
	enumerable: false,
	configurable: true,
});

StructureObserver.prototype.getScanRoom = function(iterator: number = 0): string {
	iterator++;
	if (!_.isNumber(this.memory.scannedX) || !_.isNumber(this.memory.scannedY)) {
		this.memory.scannedX = -OBSERVER_RANGE;
		this.memory.scannedY = -OBSERVER_RANGE;
	} else {
		this.memory.scannedX = this.memory.scannedX  + 1;
		if (this.memory.scannedX > OBSERVER_RANGE) {
			this.memory.scannedX = -OBSERVER_RANGE;
			this.memory.scannedY = this.memory.scannedY + 1;
			if (this.memory.scannedY > OBSERVER_RANGE) {
				this.memory.scannedY = -OBSERVER_RANGE;
			}
		}
	}
	let roomName = this.getRoomName(this.roomIndex.x + this.memory.scannedX, this.roomIndex.y + this.memory.scannedY);
	if (iterator > 10) {
		return roomName;
	}
	// Skip observing this room if we currently have vision or if we recently scanned it.
	if (!!Game.rooms[roomName] || (!!Memory.matrixCache[roomName] && !!Memory.matrixCache[roomName].s && (Game.time - Memory.matrixCache[roomName].s) < 75)) {
		return this.getScanRoom(iterator);
	} else {
		return roomName;
	}
};
StructureObserver.prototype.run = function () {
	const roomName = this.getScanRoom();
	if (!Memory.matrixCache[roomName]) {
		Memory.matrixCache[roomName] = {
			s: Game.time,
			t: -Infinity,
			m: [],
			cs: 0,
			st: 0,
		};
	} else {
		Memory.matrixCache[roomName].s = Game.time;
	}
	console.log("[OBSERVER]", this.room.name, "Scanning", roomName);
	this.observeRoom(roomName);
};
