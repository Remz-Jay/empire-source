global.colorWrap = function(text: string, color: string): string {
	return `<font color="${color}">${text}</font>`;
};

global.formatNumber = function(value: number): string {
	if (!_.isNumber(value)) {
		return value;
	}
	let inverse: boolean = false;
	if (value < 0) {
		inverse = true;
		value = Math.abs(value);
	}
	let strVal: string = value.toString();
	if (value >= 1000000) {
		strVal = _.round(value / 1000000, 2).toString() + "M";
	} else if (value >= 1000) {
		strVal = _.round(value / 1000, 2).toString() + "k";
	}
	if (inverse) {
		strVal = "-" + strVal;
	}
	return strVal;
};

// Thanks Dissi!
global.getColorBasedOnPercentage = function(thePercentage: number): string {
	const hue = Math.floor((100 - thePercentage) * 120 / 100);  // go from green to red
	const saturation = Math.abs(thePercentage - 50) / 50;
	return global.hsv2rgb(hue, saturation, 1);
};

global.hsv2rgb = function(h: number, s: number, v: number): string {
	// adapted from http://schinckel.net/2012/01/10/hsv-to-rgb-in-javascript/
	let rgb: number[] = [];
	let i: number;
	let data: number[] = [];
	if (s === 0) {
		rgb = [v, v, v];
	} else {
		h = h / 60;
		i = Math.floor(h);
		data = [v * (1 - s), v * (1 - s * (h - i)), v * (1 - s * (1 - (h - i)))];
		switch (i) {
			case 0:
				rgb = [v, data[2], data[0]];
				break;
			case 1:
				rgb = [data[1], v, data[0]];
				break;
			case 2:
				rgb = [data[0], v, data[2]];
				break;
			case 3:
				rgb = [data[0], data[1], v];
				break;
			case 4:
				rgb = [data[2], data[0], v];
				break;
			default:
				rgb = [v, data[0], data[1]];
				break;
		}
	}
	return "#" + rgb.map(function(x){
			return ("0" + Math.round(x * 255).toString(16)).slice(-2);
		}).join("");
};

global.planRoute = function(from: RoomPosition, to: RoomPosition): void {
	const route = PathFinder.search(from, to, {
		roomCallback: function (roomName: string): CostMatrix | boolean {
			try {
				const room = Game.rooms[roomName];
				if (!room) {
					return;
				}
				return room.getCostMatrix(false); // The cached one without per-tick creeps.
			} catch (e) {
				console.log(e.message, "creepAction.roomCallback", roomName);
				return new PathFinder.CostMatrix();
			}
		},
		plainCost: 2,
		swampCost: 2,
		maxOps: 10000,
	});
	if (!!route && !route.incomplete) {
		route.path.forEach((r: RoomPosition) => {
			if (r.lookFor(LOOK_STRUCTURES).length === 0) {
				r.createConstructionSite(STRUCTURE_ROAD);
			}
		});
	}
};

// Thanks ags131 !
// console.log(`<span style="line-height:1">${utils.table(incoming)}</span>`)
global.table = function(data: any[], widths?: number[]): string{
	const leftTopCorner = "╔";
	const rightTopCorner = "╗";
	const leftBottomCorner = "╚";
	const rightBottomCorner = "╝";
	const hBar = "═";
	const vBar = "║";
	// const hSBar = "─";
	const vSBar = "│";
	const bottomDSTee = "╧";
	const topDSTee = "╤";
	let rows: any[] = [];
	let width = 0;
	if (!widths) {
		widths = [];
		data.forEach(row => {
			_.values(row).forEach((v, i) => {
				// console.log(v,i)
				if (!widths[i]) {
					widths[i] = 0;
				}
				widths[i] = Math.max((v || 0).toString().length, widths[i]);
			});
		});
		// console.log(widths)
	}
	data.forEach(d => {
		const arr = d instanceof Array ? d : _.values(d);
		const r = `${vBar} ` + arr.map((v: string, i: number) => (" ".repeat(widths[i]) + v).slice(-widths[i])).join(` ${vSBar} `) + ` ${vBar}`;
		width = r.length;
		// console.log(r)
		rows.push(r);
	});
	const topBar = widths.map(w => hBar.repeat(w + 2)).join(topDSTee);
	const bottomBar = widths.map(w => hBar.repeat(w + 2)).join(bottomDSTee);
	rows.unshift(`${leftTopCorner}${topBar}${rightTopCorner}`);
	rows.push(`${leftBottomCorner}${bottomBar}${rightBottomCorner}`);
	return rows.join("\n");
};
// Thanks Dissi!
global.coordinateToCharacter = function(thePos: RoomPosition): string {
	return String.fromCodePoint(thePos.x | (thePos.y << 6));
};

global.decodeCoordinate = function(theString: string, theIndex: number): {x: number, y: number} {
	let val = theString.charCodeAt(theIndex);
	let x = (val &  0x3F);
	let y = ((val >> 6) & 0x3F);
	return {x: x, y: y};
};

global.revStr = function(s: string): string {
	let o = "";
	for (let i = s.length - 1; i >= 0; i--) {
		o = o + s[i];
	}
	return o;
};

global.gclCalc = function() {
	let runTimeGCL = 10;
	if ((Game.time % runTimeGCL) === 0) {
		let timer = Game.time;
		let memName = "Estimates";
		if (Memory.stats[memName] === undefined) {
			Memory.stats[memName] = {
				nextGCLLevelTick: 0,
				currentGCLProgress: 0,
				lastGCLProgress: 0,
				estimatedTime: 0,
			};
		} else {
			let GCLData = Memory.stats[memName];
			if (GCLData.currentGCLProgress === 0) {
				GCLData.currentGCLProgress = Game.gcl.progress;
				GCLData.currentTime = Date.now();
			} else {
				GCLData.lastGCLProgress = GCLData.currentGCLProgress;
				GCLData.lastTime = GCLData.currentTime;
				GCLData.currentGCLProgress = (Game.gcl.progress + GCLData.lastGCLProgress) / 2;
				GCLData.currentTime = Date.now();
				let progressPer1kTicks = Number(Game.time) + (Game.gcl.progressTotal - Game.gcl.progress) / ((GCLData.currentGCLProgress - GCLData.lastGCLProgress));
				GCLData.nextGCLLevelTick = progressPer1kTicks.toFixed(0);
				let seconds = 3;
				let milliseconds = 1000 * seconds;
				let CEST = 1000 * 60 * 60 * 2;
				let t = new Date();
				t.setTime(((Game.gcl.progressTotal - Game.gcl.progress) / (GCLData.currentGCLProgress - GCLData.lastGCLProgress) * runTimeGCL) * milliseconds);
				let options = {
					weekday: "long",
					day: "numeric",
					month: "long",
					year: "numeric",
					hour: "numeric",
					minute: "numeric",
					timeZone: "Europe/Amsterdam",
					timeZoneName: "short",
					hour12: false,
				};
				GCLData.estimatedTime = (new Date(Date.now() + t.getTime() + CEST)).toLocaleString("nl", options);
			}
			Memory.stats[memName] = GCLData;
			console.log(`${Game.time} Estimated GCL leveling, Tick: ${GCLData.nextGCLLevelTick}, Date: ${GCLData.estimatedTime} Execution time: ${Game.time - timer}`);
			if ((Game.time % 50000) === 0) {
				Game.notify(`(${Game.time}): Estimated GCL leveling, Tick: ${GCLData.nextGCLLevelTick}, `
				+ `Date: ${GCLData.estimatedTime}\n Execution time: ${Game.time - timer}`);
			}
		}
	}
};

// Implementation of Lodash 4.15.0 functions
/**
 * The base implementation of `_.clamp` which doesn't coerce arguments.
 *
 * @private
 * @param {number} number The number to clamp.
 * @param {number} [lower] The lower bound.
 * @param {number} upper The upper bound.
 * @returns {number} Returns the clamped number.
 */
global.baseClamp = function(n: number, lower: number, upper: number): number {
	if (n === n) {
		if (upper !== undefined) {
			n = n <= upper ? n : upper;
		}
		if (lower !== undefined) {
			n = n >= lower ? n : lower;
		}
	}
	return n;
};

/*------------------------------------------------------------------------*/

/**
 * Clamps `number` within the inclusive `lower` and `upper` bounds.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Number
 * @param {number} number The number to clamp.
 * @param {number} [lower] The lower bound.
 * @param {number} upper The upper bound.
 * @returns {number} Returns the clamped number.
 * @example
 *
 * _.clamp(-10, -5, 5);
 * // => -5
 *
 * _.clamp(10, -5, 5);
 * // => 5
 */
global.clamp = function(n: number, lower: number, upper: number): number {
	if (upper === undefined) {
		upper = lower;
		lower = undefined;
	}
	if (upper !== undefined) {
		upper = upper === upper ? upper : 0;
	}
	if (lower !== undefined) {
		lower = lower === lower ? lower : 0;
	}
	return global.baseClamp(n, lower, upper);
};
