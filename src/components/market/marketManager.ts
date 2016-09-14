export function governMarket(): void {
	if (Game.cpu.bucket > global.BUCKET_MIN) {
		switch (Game.time % 10) {
			case 0:
				cleanupOrders();
				break;
			case 1:
				findDeals();
				break;
			default:
				return;
		}
	}
}

export function cleanupOrders(): void {
	_.forOwn(Game.market.orders, (order: Order, id: string) => {
		if (order.resourceType !== SUBSCRIPTION_TOKEN && order.totalAmount > 100 && order.remainingAmount < 100) {
			Game.market.cancelOrder(order.id);
		}
		// console.log(global.colorWrap(`[MARKET] ${order.id}, ${order.type}, ${order.resourceType}, ${order.price}, ${order.remainingAmount}`, "cyan"));
	});
}
interface MarketThresholdsObject {
	[k: string]: number;
}
const marketThresholds: MarketThresholdsObject = {
	H: 0.5,
	O: 0.5,
	Z: 1.0,
	K: 1.0,
	U: 1.0,
	L: 1.0,
	X: 1.0,
};

export function findDeals(): void {
	console.log(`[MARKET] Doing a market price scan.`);
	_.forOwn(marketThresholds, (price: number, resource: string) => {
		// console.log(`[MARKET] ${resource} at ${price}`);
		let orders = Game.market.getAllOrders((order: Order) =>
			order.type === ORDER_SELL
			&& order.resourceType === resource
			&& order.price < price
			&& !_.has(Game.rooms, order.roomName)
			&& Game.map.getRoomLinearDistance("W6N42", order.roomName) < 71
			&& Game.market.calcTransactionCost(order.remainingAmount, "W6N42", order.roomName) <= global.TERMINAL_MAX
		);
		if (!!orders && orders.length > 0) {
			orders.forEach((order: Order) => {
				let cost = order.remainingAmount * order.price;
				let transferCost = Game.market.calcTransactionCost(order.remainingAmount, "W6N42", order.roomName);
				let sellsFor = order.remainingAmount * price;
				let profit = sellsFor - cost;
				console.log(global.colorWrap(`[MARKET] found an interesting deal on ${resource}: ${order.remainingAmount.toLocaleString()} at ${order.price}. `
					+ `Range: ${Game.map.getRoomLinearDistance("W6N42", order.roomName)} (${order.roomName}). `
					+ `Cost: ${cost.toLocaleString()}, Profit: ${profit.toLocaleString()}, Transfer: ${transferCost.toLocaleString()} energy. ID: ${order.id}`, "cyan"));
			});
		}
	});
	let orders = Game.market.getAllOrders((order: Order) =>
		order.type === ORDER_BUY
		&& order.resourceType === SUBSCRIPTION_TOKEN
		&& order.price >= 3000000
	);
	if (!!orders && orders.length > 0) {
		let order = _.sortBy(orders, "price").pop();
		let status = Game.market.deal(order.id, 1);
		if (status === OK) {
			Game.notify(`Sold 1 token at ${order.price}. PROFIT!`);
		}
	}
}
global.findDeals = findDeals;

export function resourceReport(): void {
	let resources: ResourceList = {"energy": 0};
	_.forEach(Game.rooms, (r: Room) => {
		if (!!r.controller && r.controller.my) {
			if (!!r.storage) {
				_.forEach(r.storage.store, (value: number, key: string) => {
					if (!!resources[key]) {
						resources[key] += value;
					} else {
						resources[key] = value;
					}
				});
			}
			if (!!r.terminal) {
				_.forEach(r.terminal.store, (value: number, key: string) => {
					if (!!resources[key]) {
						resources[key] += value;
					} else {
						resources[key] = value;
					}
				});
			}
		}
	});
	let roomList = _.filter(Game.rooms, (r: Room) => !!r.controller && !!r.controller.my && r.controller.level > 3);
	let elementList = [
		"Resource",
		"Total",
	];
	roomList.forEach((r: Room) => {
		elementList.push(r.name);
	});
	let header: string = "\u2551";
	let topLine = "\u2554";
	let guideLine = "\u2560";
	let bottomLine = "\u255a";
	elementList.forEach((s: string) => {
		header = header.concat(" " + _.padRight(s, 9) + "\u2551");
		topLine = topLine.concat("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2566");
		guideLine = guideLine.concat("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u256c");
		bottomLine = bottomLine.concat("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2569");
	});
	topLine = topLine.slice(0, -1) + "\u2557";
	guideLine = guideLine.slice(0, -1) + "\u2563";
	bottomLine = bottomLine.slice(0, -1) + "\u255d";
	console.log(topLine);
	console.log(header);
	console.log(guideLine);
	let tracers: string[] = [];
	RESOURCES_ALL.forEach((key: string) => {
		let globalRunning: boolean = false;
		let value = resources[key] || 0;
		if (value > 1000) {
			let line: string = "";
			line = line.concat(" " + formatAmount(value) + "\u2551");
			roomList.forEach((r: Room) => {
				let roomRunning: boolean = false;
				if (!!Game.flags[r.name + "_LR"]) {
					let flag = Game.flags[r.name + "_LR"];
					if (!(flag.color === COLOR_WHITE && flag.secondaryColor === COLOR_RED)) { // Clean All
						let reaction = global.labColors.resource(flag.color, flag.secondaryColor);
						if (reaction === key) {
							roomRunning = true;
							globalRunning = true;
						}
					}
				}
				let storageVal = (!!r.storage) ? r.storage.store[key] || 0 : 0;
				let terminalVal = (!!r.terminal) ? r.terminal.store[key] || 0 : 0;
				let totalVal = storageVal + terminalVal;
				if (roomRunning) {
					line = line.concat(" " + formatAmount(totalVal, "CornflowerBlue") + "\u2551");
				} else {
					line = line.concat(" " + formatAmount(totalVal) + "\u2551");
				}
			});
			if (globalRunning) {
				line = "\u2551 <b>" + global.colorWrap(_.padRight(key, 9), "CornflowerBlue") + "</b>\u2551".concat(line);
			} else {
				line = "\u2551 <b>" + _.padRight(key, 9) + "</b>\u2551".concat(line);
			}
			console.log(line);
		} else if (value > 0) {
			tracers.push(key + ` (${value})`);
		}
	});
	console.log(bottomLine);
	let tracerLine = "Also found traces of: ";
	tracers.forEach((s: String) => {
		tracerLine = tracerLine.concat(s + ", ");
	});
	tracerLine = tracerLine.slice(0, -2) + ".";
	console.log(tracerLine);
}
global.resourceReport = resourceReport;

export function formatAmount(value: number, overrideColor?: string): string {
	let strVal: string = value.toString();
	if (value > 1000000) {
		strVal = _.round(value / 1000000, 2).toString() + "M";
	} else if (value > 1000) {
		strVal = _.round(value / 1000, 2).toString() + "k";
	}
	strVal = _.padRight(" " + strVal, 9);
	if (_.isString(overrideColor)) {
		strVal = global.colorWrap(strVal, overrideColor);
	} else {
		if (value > global.STORAGE_MIN) {
			strVal = global.colorWrap(strVal, "LightGreen");
		} else if (value > global.STORAGE_MIN / 2) {
			strVal = global.colorWrap(strVal, "Orange");
		} else {
			strVal = global.colorWrap(strVal, "Salmon");
		}
	}
	return strVal;
}
export function dumpResource(resource: string) {
	let roomList = _.filter(Game.rooms, (r: Room) => !!r.controller && !!r.controller.my && !!r.storage && !!r.terminal);
	roomList.forEach((r: Room) => {
		if (!!r.storage.store[resource] && r.storage.store[resource] > global.STORAGE_MIN
			&& r.terminal.store[resource] && r.terminal.store[resource] >= global.TERMINAL_MAX
		) {
			let canSell = r.terminal.store[resource];
			let availableEnergy = r.terminal.store.energy;
			console.log(`Room ${r.name} has ${formatAmount(r.storage.store[resource])} x ${resource} in storage.`);
			let price: number = marketThresholds[resource];
			let orders = Game.market.getAllOrders((order: Order) =>
				order.type === ORDER_BUY
				&& order.resourceType === resource
				&& order.price >= price
				&& order.remainingAmount >= canSell
				&& !_.has(Game.rooms, order.roomName)
				&& Game.map.getRoomLinearDistance(r.name, order.roomName) < 10
			);
			if (!!orders && orders.length > 0) {
				let bestPrice = 0;
				let bestDistance = Infinity;
				let bestOrder: Order;
				orders.forEach((order: Order) => {
					let orderDistance = Game.map.getRoomLinearDistance(r.name, order.roomName);
					console.log(global.colorWrap(`[MARKET] found candidate: ${order.remainingAmount.toLocaleString()} at ${order.price}. `
						+ `Range: ${orderDistance} (${order.roomName}). `
						+ `ID: ${order.id}`, "cyan"));
					if (order.price > bestPrice) {
						bestPrice = order.price;
						bestDistance = orderDistance;
						bestOrder = order;
					} else if (order.price === bestPrice && orderDistance < bestDistance) {
						bestDistance = orderDistance;
						bestOrder = order;
					}
				});
				if (!!bestOrder) {
					let cost = canSell * bestOrder.price;
					let transferCost = Game.market.calcTransactionCost(canSell, r.name, bestOrder.roomName);
					if (availableEnergy >= transferCost) {
						console.log(global.colorWrap(`[MARKET] Decided to sell to: ${bestOrder.remainingAmount.toLocaleString()} at ${bestOrder.price}. `
							+ `Range: ${bestDistance} (${bestOrder.roomName}). `
							+ `Profit: ${cost.toLocaleString()}, Transfer: ${transferCost.toLocaleString()} energy. ID: ${bestOrder.id}`, "LightGreen"));
						Game.market.deal(bestOrder.id, canSell, r.name);
					} else {
						console.log(
							global.colorWrap(`[MARKET] ${r.name} as insufficient Terminal Energy to cover the transaction. (${availableEnergy} of ${transferCost})`,
							"OrangeRed")
						);
					}
				}
			}
		}
	});
}
global.dumpResource = dumpResource;
export function transactionReport(numTransactions = 5): void {
	console.log(global.colorWrap(`[MARKET] Incoming Transactions:`, "Red"));
	_.take(Game.market.incomingTransactions, numTransactions).forEach((t: Transaction) => {
		t = _.defaults<Transaction>(t, {
			sender: {username: "NPC"},
			description: global.colorWrap("Market Transaction", "Orange"),
		});
		console.log(t.sender.username, t.resourceType, t.amount, t.from, t.to, t.description);
	});
	console.log(global.colorWrap(`Outgoing Transactions:`, "Teal"));
	_.take(Game.market.outgoingTransactions, numTransactions).forEach((t: Transaction) => {
		_.defaults<Transaction>(t, {
			recipient: {username: "NPC"},
			description: global.colorWrap("Market Transaction", "Orange"),
		});
		console.log(t.recipient.username, t.resourceType, t.amount, t.from, t.to, t.description);
	});
}
global.transactionReport = transactionReport;
