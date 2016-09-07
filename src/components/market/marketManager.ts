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
		if (order.remainingAmount < 100) {
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
