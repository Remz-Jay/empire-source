interface StructureTerminal {
	run(): boolean;
	autoSell(): boolean;
	processTransactions(): boolean;
}

StructureTerminal.prototype.processTransactions = function(): boolean {
	let batchSize = global.TERMINAL_MAX;
	let sending: boolean = false;
	if (!!Memory.transactions && Memory.transactions.length > 0 && !sending && this.store.energy >= global.TERMINAL_MAX) {
		Memory.transactions.forEach((t: TerminalTransaction) => {
			if (t.recipient !== this.room.name && t.totalAmount - t.sentAmount > 0 && this.store[t.resource] >= batchSize) {
				batchSize = global.clamp(batchSize, 0, (t.totalAmount - t.sentAmount));
				let transferCosts: number = Game.market.calcTransactionCost(batchSize, this.room.name, t.recipient);
				if (this.store.energy >= transferCosts) {
					let description = `ID:[${t.id}] - ${t.description} - ` + `${global.formatNumber(t.sentAmount + batchSize)}/${global.formatNumber(t.totalAmount)}`;
					console.log(t.resource, batchSize, t.recipient, description, description.length);
					let status = this.send(t.resource, batchSize, t.recipient, description);
					if (status === OK) {
						sending = true;
						global.sendRegistry.push(t.resource);
						console.log(`Terminal.processTransactions, sending ${t.resource} x ${batchSize}`
							+ ` from ${this.room.name} to ${t.recipient}`);
						t.sentAmount = t.sentAmount + batchSize;
					} else {
						console.log(`Terminal.processTransactions, error ${global.translateErrorCode(status)} while transferring ${t.resource}`
							+ ` from ${this.room.name} to ${t.recipient}`);
					}
					return true;
				}
			}
		});
		return false;
	}
	return false;
};

StructureTerminal.prototype.autoSell = function(): boolean {
	let storage = this.room.storage;
	let sending: boolean = false;
	let minType: string = this.room.minerals[0].mineralType;
	if (!sending
		&& Game.cpu.bucket > global.BUCKET_MIN
		&& this.store.energy >= global.TERMINAL_MAX
		&& storage.store[minType] > global.STORAGE_MIN
		&& this.store[minType] >= global.TERMINAL_MAX
	) {
		try {
			let threshold = global.tradeTreshold(minType);
			if (_.isNumber(threshold)) {
				let offers = Game.market.getAllOrders({resourceType: minType, type: ORDER_BUY}).filter((order: Order) =>
					order.price >= threshold
					&& Game.map.getRoomLinearDistance(this.room.name, order.roomName) < 50 // At 70 the energy costs equal the amount to transfer.
				) as Order[];
				if (offers.length > 0) {
					let offer = _.sortBy(offers, "price").shift();
					let amount = global.clamp(offer.remainingAmount, 0, this.store[minType]);
					let status = Game.market.deal(offer.id, amount, this.room.name);
					if (status === OK) {
						console.log(global.colorWrap(`[MARKET] AutoSelling ${amount} ${minType} in ${this.room.name} at price ${offer.price}`
							+ ` - order ${offer.id}.`, "DeepPink"));
					}
					return true;
				}
			}
		} catch (e) {
			console.log("Terminal.prototype.marketTrade ERROR ::" + e.message);
		}
	}
	return false;
};

StructureTerminal.prototype.run = function (): boolean {
	let storage = this.room.storage;
	let sending: boolean = false;
	let batchSize: number = 1000;

	let roomList = _.filter(Game.rooms, (r: Room) => !!r.controller && !!r.controller.my && r.controller.level > 5 && !!r.storage && !!r.terminal);
	if (this.store.energy >= global.TERMINAL_ENERGY_MAX
		&& storage.store.energy >= (global.STORAGE_MIN + global.TERMINAL_ENERGY_MAX)
	) {
		// Find a room that needs energy.
		_.forEach(roomList, (room: Room) => {
			if (!sending
				&& room.name !== this.room.name
				&& !_.includes(global.sendRegistry, RESOURCE_ENERGY)
				&& room.storage.store.energy < (global.STORAGE_MIN - global.TERMINAL_ENERGY_MAX)
			) {
				let transferCosts: number = Game.market.calcTransactionCost(global.TERMINAL_ENERGY_MAX, this.room.name, room.name);
				let transferAmount: number = global.TERMINAL_ENERGY_MAX - transferCosts;
				let status = this.send(RESOURCE_ENERGY, transferAmount, room.name);
				if (status === OK) {
					sending = true;
					global.sendRegistry.push(RESOURCE_ENERGY);
					console.log(`Terminal.RefillEnergy, sending ${RESOURCE_ENERGY} x ${transferAmount}`
					+ ` from ${this.room.name} to ${room.name}`);
				} else {
					console.log(`Terminal.RefillEnergy, error ${global.translateErrorCode(status)} while transferring`
					+ ` from ${this.room.name} to ${room.name}`);
				}
				return true;
			}
		});
		let powerRoom = Game.rooms[global.POWER_ROOM];
		if (!sending && this.room.name !== global.POWER_ROOM
			&& storage.store.energy > (2 * global.STORAGE_MIN)
			&& powerRoom.storage.store.energy <= (2 * global.STORAGE_MIN)
		) {
			let transferCosts: number = Game.market.calcTransactionCost(global.TERMINAL_ENERGY_MAX, this.room.name, global.POWER_ROOM);
			let transferAmount: number = global.TERMINAL_ENERGY_MAX - transferCosts;
			let status = this.send(RESOURCE_ENERGY, transferAmount, global.POWER_ROOM);
			if (status === OK) {
				sending = true;
				global.sendRegistry.push(RESOURCE_ENERGY);
				console.log(`Terminal.SupplyForPower, sending ${RESOURCE_ENERGY} x ${transferAmount}`
					+ ` from ${this.room.name} to ${global.POWER_ROOM}`);
			}else {
				console.log(`Terminal.SupplyForPower, error ${global.translateErrorCode(status)} while transferring`
					+ ` from ${this.room.name} to ${global.POWER_ROOM}`);
			}
		}
	}

	let resourceBlacklist: string[] = global.TERMINAL_SKIP_BALANCE_RESOURCES;
	global.boostReagents.forEach((br: any) => {
		resourceBlacklist.push(br.reagent);
		if (!sending && Game.cpu.bucket > global.BUCKET_MIN) {
			if (!sending
				&& br.room.name !== this.room.name
				&& !_.includes(global.sendRegistry, br.reagent)
				&& this.store[br.reagent] >= batchSize
				&& (!br.room.terminal.store[br.reagent] || br.room.terminal.store[br.reagent] < global.TERMINAL_MAX)
				&& !br.room.storage.store[br.reagent]
			) {
				let transferCosts: number = Game.market.calcTransactionCost(batchSize, this.room.name, br.room.name);
				if (this.store.energy >= transferCosts) {
					let status = this.send(br.reagent, batchSize, br.room.name);
					if (status === OK) {
						sending = true;
						global.sendRegistry.push(br.reagent);
						console.log(`Terminal.RefillBoost, sending ${br.reagent} x ${batchSize}`
						+ ` from ${this.room.name} to ${br.room.name}`);
					} else {
						console.log(`Terminal.RefillBoost, error ${global.translateErrorCode(status)} while transferring ${br.reagent}`
						+ ` from ${this.room.name} to ${br.room.name}`);
					}
					return true;
				}
			}
		}
	});
	global.labReactions.forEach((lr: any) => {
		resourceBlacklist = _.union(resourceBlacklist, lr.reagents);
		resourceBlacklist.push(lr.reaction);
		if (!sending && Game.cpu.bucket > global.BUCKET_MIN) {
			lr.reagents.forEach((reagent: string) => {
				if (!sending
					&& lr.room.name !== this.room.name
					&& !_.includes(global.sendRegistry, reagent)
					&& this.store[reagent] >= batchSize
					&& (!lr.room.terminal.store[reagent] || lr.room.terminal.store[reagent] < global.TERMINAL_MAX)
					&& !lr.room.storage.store[reagent]
				) {
					let transferCosts: number = Game.market.calcTransactionCost(batchSize, this.room.name, lr.room.name);
					if (this.store.energy >= transferCosts) {
						let status = this.send(reagent, batchSize, lr.room.name);
						if (status === OK) {
							sending = true;
							global.sendRegistry.push(reagent);
							console.log(`Terminal.LabReaction, sending ${reagent} x ${batchSize} to run ${lr.reaction}`
							+ ` from ${this.room.name} to ${lr.room.name}`);
						} else {
							console.log(`Terminal.LabReaction, error ${global.translateErrorCode(status)} while transferring ${reagent}`
							+ ` from ${this.room.name} to ${lr.room.name}`);
						}
						return true;
					}
				}
			});
		}
	});
	if (!sending && Game.cpu.bucket > global.BUCKET_MIN) {
		let resources = _.difference(RESOURCES_ALL, resourceBlacklist);
		resources = _.difference(resources, global.sendRegistry);
		resources.forEach((resource: string) => {
			if (sending) {
				return;
			}
			if (!!storage.store[resource]
				&& storage.store[resource] > global.TERMINAL_MAX
				&& this.store[resource] >= global.TERMINAL_MAX
			) {
				_.forEach(roomList, (room: Room) => {
					if (!sending
						&& !room.storage.store[resource]
						&& (!room.terminal.store[resource] || room.terminal.store[resource] < global.TERMINAL_MAX)
					) {
						let transferCosts: number = Game.market.calcTransactionCost(batchSize, this.room.name, room.name);
						if (this.store.energy >= transferCosts) {
							let status = this.send(resource, batchSize, room.name);
							if (status === OK) {
								sending = true;
								global.sendRegistry.push(resource);
								console.log(`Terminal.BalanceRooms, sending ${resource} x ${batchSize}`
								+ ` from ${this.room.name} to ${room.name}`);
							} else {
								console.log(`Terminal.BalanceRooms, error ${global.translateErrorCode(status)} while transferring ${resource}`
								+ ` from ${this.room.name} to ${room.name}`);
							}
							return true;
						}
					}
				});
			}
		});
	}
	return false;
};
