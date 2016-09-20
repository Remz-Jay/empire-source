import * as WallManager from "../walls/wallManager";

export let room: Room;
export let ramparts: StructureRampart[];

export function load(r: Room) {
	room = r;
	ramparts = getRamparts();
}
export function getAverageStrength() {
	return _.round(_.sum(ramparts, "hits") / _.size(ramparts));
}
export function getMinimumStrength() {
	return _.round(_.min(ramparts, "hits").hits);
}
export function getWeakestRampart() {
	return _.min(ramparts, function (o) {
		return o.hits;
	});
}
export function adjustStrength() {
	let current = Memory.config.Rampart[room.name].strength;
	let avg = getAverageStrength();
	let avgWall = WallManager.getAverageStrength();
	// if walls are stronger than ramparts and ramparts aren"t at max strength:
	if (avg < avgWall && avg < _.sample(ramparts).hitsMax && avg > current) {
		Memory.config.Rampart[room.name].strength = avg;
		console.log("Adjusting Rampart Strength for room " + room.name + " to " + avg);
	}
}

function getRamparts(): StructureRampart[] {
	let r = room.myStructures.filter((s: Structure) => s.structureType === STRUCTURE_RAMPART) as StructureRampart[];
	if (Memory.config.Rampart === undefined) {
		Memory.config.Rampart = {};
	}
	if (Memory.config.Rampart[room.name] === undefined) {
		Memory.config.Rampart[room.name] = {};
	}
	if (Memory.config.Rampart[room.name].strength === undefined) {
		Memory.config.Rampart[room.name].strength = 10000;
	}
	return r;
}
