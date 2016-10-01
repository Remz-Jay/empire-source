export let room: Room;
export let walls: StructureWall[];

export function load(r: Room) {
	room = r;
	walls = getWalls();
}
export function getAverageStrength() {
	return _.round(_.sum(walls, "hits") / _.size(walls));
}
export function getMinimumStrength() {
	return _.round(_.min(walls, "hits").hits);
}
export function getWeakestWall() {
	return _.min(walls, function (o) {
		return o.hits;
	});
}
export function adjustStrength() {
	const current = Memory.config.Wall[room.name].strength;
	const avg = getAverageStrength();
	if (avg > current) {
		Memory.config.Wall[room.name].strength = avg;
		console.log("Adjusting Wall Strength for room " + room.name + " to " + avg);
	}
}

function getWalls(): StructureWall[] {
	const w = room.allStructures.filter((s: Structure) => s.structureType === STRUCTURE_WALL) as StructureWall[];
	if (Memory.config.Wall === undefined) {
		Memory.config.Wall = {};
	}
	if (Memory.config.Wall[room.name] === undefined) {
		Memory.config.Wall[room.name] = {};
	}
	if (Memory.config.Wall[room.name].strength === undefined) {
		Memory.config.Wall[room.name].strength = 10000;
	}
	return w;
}
