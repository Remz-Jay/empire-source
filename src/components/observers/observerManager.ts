export default class ObserverManager {
	public observers: StructureObserver[] = [];
	constructor() {
		_.forEach(Game.rooms, (r: Room) => {
			if (!!r.observer) {
					this.observers.push(r.observer);
			}
		});
	}
	public observe(): void {
		console.log(`Number of observers found: ${this.observers.length}`);
	}
}
