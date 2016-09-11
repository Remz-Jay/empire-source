export function governMarket(): void {
	if (Game.cpu.getUsed() < Game.cpu.limit) {
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

const marketTresholds = {
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
	_.forOwn(marketTresholds, (price: number, resource: string) => {
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
	let resources: any = {};
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
				_.forEach(r.storage.store, (value: number, key: string) => {
					if (!!resources[key]) {
						resources[key] += value;
					} else {
						resources[key] = value;
					}
				});
			}
		}
	});
	// resources = _.map(resources, (v: number, k: string) => [k, v]).sortBy(0).fromPairs().value();
	_.forOwn(resources, (value: number, key: string) => {
		let strVal: string = value.toString();
		if (value > 1000000) {
			strVal = _.round(value / 1000000, 2).toString() + "M";
		} else if (value > 1000) {
			strVal = _.round(value / 1000, 2).toString() + "K";
		}
		console.log(`[MARKET]\t${key}\t${strVal}`);
	});
}
global.resourceReport = resourceReport;

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
