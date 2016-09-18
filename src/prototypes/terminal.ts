interface StructureTerminal {
	run(): void;
}
StructureTerminal.prototype.run = function () {
	let storage = this.room.storage;
	let sending: boolean = false;
	let minType: string = this.room.minerals[0].mineralType;
	let batchSize: number = 200;
	let resourceBlacklist: string[] = [
		RESOURCE_ENERGY,
		RESOURCE_POWER,
	];
	let roomList = _.filter(Game.rooms, (r: Room) => !!r.controller && !!r.controller.my && !!r.storage && !!r.terminal);
	if (this.store.energy >= global.TERMINAL_ENERGY_MAX && storage.store.energy >= (global.STORAGE_MIN + global.TERMINAL_ENERGY_MAX)) {
		// Find a room that needs energy.
		_.forEach(roomList, (room: Room) => {
			if (!sending && room.storage.store.energy < (global.STORAGE_MIN - global.TERMINAL_ENERGY_MAX)) {
				let transferCosts: number = Game.market.calcTransactionCost(global.TERMINAL_ENERGY_MAX, this.room.name, room.name);
				let transferAmount: number = global.TERMINAL_MAX - transferCosts;
				let status = this.send(RESOURCE_ENERGY, batchSize, room.name);
				if (status === OK) {
					sending = true;
					console.log(`Terminal.RefillEnergy, sending ${RESOURCE_ENERGY} x ${transferAmount} from ${this.room.name} to ${room.name}`);
				} else {
					console.log(`Terminal.RefillEnergy, error ${global.translateErrorCode(status)} while transferring from ${this.room.name} to ${room.name}`);
				}
			}
		});
	}
	if (!sending && Game.cpu.bucket > global.BUCKET_MIN) {
		let resources = _.difference(RESOURCES_ALL, resourceBlacklist);
		resources = _.difference(resources, global.sendRegistry);
		resources.forEach((resource: string) => {
			if (sending) {
				return;
			}
			if (!!storage.store[resource] && storage.store[resource] > global.TERMINAL_MAX && this.store[resource] >= global.TERMINAL_MAX) {
				_.forEach(roomList, (room: Room) => {
					if (!sending && !room.storage.store[resource] && (!room.terminal.store[resource] || room.terminal.store[resource] < global.TERMINAL_MAX)) {
						let transferCosts: number = Game.market.calcTransactionCost(batchSize, this.room.name, room.name);
						if (this.store.energy >= transferCosts) {
							let status = this.send(resource, batchSize, room.name);
							if (status === OK) {
								sending = true;
								global.sendRegistry.push(resource);
								console.log(`Terminal.BalanceRooms, sending ${resource} x ${batchSize} from ${this.room.name} to ${room.name}`);
							} else {
								console.log(`Terminal.BalanceRooms, error ${global.translateErrorCode(status)} while transferring ${resource} from ${this.room.name} to ${room.name}`);
							}
						}
					}
				});
			}
		});
	}
	if (!sending
		&& Game.cpu.bucket > global.BUCKET_MIN
		&& this.store.energy >= global.TERMINAL_MAX
		&& storage.store[minType] > global.STORAGE_MIN
		&& this.store[minType] >= global.TERMINAL_MAX
		&& (true === false)
	) {
		try {
			let threshold = global.tradeTreshold(minType);
			if (_.isNumber(threshold)) {
				let offers = Game.market.getAllOrders((order: Order) =>
					order.type === ORDER_BUY
					&& order.resourceType === minType
					&& order.price >= threshold
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
