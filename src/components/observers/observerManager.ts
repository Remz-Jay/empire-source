export default class ObserverManager {
	public observers: StructureObserver[] = [];
	public observationTargets: string[] = [
		"W5N45",
		"W2N46",
	];
	constructor() {
		this.observers = _.map(_.filter(Game.rooms, (r: Room) => !!r.observer), "observer") as StructureObserver[];
	}
	public observe(): void {
		let index: number = 0;
		this.observationTargets.forEach((roomName: string) => {
			if (Game.time % this.observationTargets.length === index) {
				this.observers[0].observeRoom(roomName);
			}
			if (!!Game.rooms[roomName]) {
				let observationRoom = Game.rooms[roomName];
				let hostileString = `${observationRoom.hostileCreeps.length} hostiles`;
				let controllerString: string;
				if (!!observationRoom.controller && !!observationRoom.controller.owner) {
					controllerString = `Controller at RCL ${observationRoom.controller.level} (TTD: ${observationRoom.controller.ticksToDowngrade})`;
				} else {
					controllerString = "No Controller";
				}
				let m = observationRoom.minerals[0];
				let mineralString: string = `${m.mineralType} Mineral with `;
				if (m.mineralAmount > 0) {
					mineralString = mineralString.concat(`${m.mineralAmount} remaining.`);
				} else {
					mineralString = mineralString.concat(`${m.ticksToRegeneration} ticks cooldown.`);
				}
				console.log(`ObservationRoom ${roomName} has ${[hostileString, controllerString, mineralString].join(", ")}`);
			}
			++index;
		});

	}
}
