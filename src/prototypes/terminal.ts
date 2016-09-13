interface StructureTerminal {
	run(): void;
}
StructureTerminal.prototype.run = function () {
	let storage = this.room.storage;
	let sending: boolean = false;
	let minType: string = this.room.minerals[0].mineralType;
	if (this.store.energy >= global.TERMINAL_MAX && storage.store.energy > (2 * global.STORAGE_MIN)) {
		// Find a room that needs energy.
		_.forEach(Game.rooms, (room: Room) => {
			if (!sending && !!room.terminal && room.terminal.my && room.storage.store.energy < global.STORAGE_MIN) {
				let status = this.send(RESOURCE_ENERGY, (global.TERMINAL_MAX - Game.market.calcTransactionCost(global.TERMINAL_MAX, this.room.name, room.name)), room.name);
				if (status === OK) {
					sending = true;
				}
			}
		});
	}
	if (!sending
		&& this.store.energy >= global.TERMINAL_MAX
		&& storage.store[minType] > global.STORAGE_MIN
		&& this.store[minType] >= global.TERMINAL_MAX
	) {
		// Find a room that needs our mineral
		_.forEach(Game.rooms, (room: Room) => {
			if (!sending && !!room.terminal && room.terminal.my && (!room.terminal.store[minType] || room.terminal.store[minType] < (global.TERMINAL_MAX * 0.9))) {
				let status = this.send(minType, 10000, room.name);
				if (status === OK) {
					sending = true;
				}
			}
		});
	}
	if (!sending
		&& Game.cpu.getUsed() < (Game.cpu.limit * 0.95)
		&& this.store.energy >= global.TERMINAL_MAX
		&& storage.store[minType] > global.STORAGE_MIN
		&& this.store[minType] >= global.TERMINAL_MAX
	) {
		try {
			let treshold = global.tradeTreshold(minType);
			if (_.isNumber(treshold)) {
				let offers = Game.market.getAllOrders((order: Order) =>
					order.type === ORDER_BUY
					&& order.resourceType === minType
					&& order.price >= treshold
					&& Game.map.getRoomLinearDistance(this.room.name, order.roomName) < 50 // At 70 the energy costs equal the amount to transfer.
				);
				if (offers.length > 0) {
					let offer = _.sortBy(offers, "price").shift();
					let amount = offer.remainingAmount;
					if (amount > this.store[minType]) {
						amount = this.store[minType];
					}
					let status = Game.market.deal(offer.id, amount, this.room.name);
					if (status === OK) {
						console.log(global.colorWrap(`[MARKET] AutoSelling ${amount} ${minType} in ${this.room.name} at price ${offer.price} - order ${offer.id}.`, "DeepPink"));
					}
				}
			}
		} catch (e) {
			console.log("Terminal.prototype.marketTrade ERROR ::" + e.message);
		}
	}
};
