interface StructureTerminal {
	storage: StructureStorage;
	sending: boolean;
	run(): boolean;
	autoSell(): boolean;
	processTransactions(): boolean;
}

Object.defineProperty(StructureTerminal.prototype, "storage", {
	get: function storage() {
		delete this.storage;
		return this.storage = this.room.storage;
	},
	configurable: true,
	enumerable: false,
});
Object.defineProperty(StructureTerminal.prototype, "sending", {
	value: false,
	writable: true,
	configurable: true,
	enumerable: false,
});

StructureTerminal.prototype.processTransactions = function(): boolean {
	let batchSize = global.TERMINAL_MAX;
	if (!!Memory.transactions && Memory.transactions.length > 0 && !this.sending && this.store.energy >= global.TERMINAL_MAX) {
		Memory.transactions.forEach((t: TerminalTransaction) => {
			if (t.recipient !== this.room.name && t.totalAmount - t.sentAmount > 0 && this.store[t.resource] >= batchSize) {
				batchSize = global.clamp(batchSize, 0, (t.totalAmount - t.sentAmount));
				const transferCosts: number = Game.market.calcTransactionCost(batchSize, this.room.name, t.recipient);
				if (this.store.energy >= transferCosts) {
					const description = `ID:[${t.id}] - ${t.description} - ` + `${global.formatNumber(t.sentAmount + batchSize)}/${global.formatNumber(t.totalAmount)}`;
					console.log(t.resource, batchSize, t.recipient, description, description.length);
					const status = this.send(t.resource, batchSize, t.recipient, description);
					if (status === OK) {
						this.sending = true;
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

// TODO: Base this on the ResourceTarget (empire wide) instead of STORAGE_MIN (local room)
StructureTerminal.prototype.autoSell = function(): boolean {
	const minType: string = this.room.minerals[0].mineralType;
	if (!this.sending
		&& Game.cpu.bucket > global.BUCKET_MIN
		&& this.store.energy >= global.TERMINAL_MAX
		&& this.storage.store[minType] > global.STORAGE_MIN
		&& this.store[minType] >= global.TERMINAL_MAX
	) {
		try {
			const threshold = global.tradeTreshold(minType);
			if (_.isNumber(threshold)) {
				const offers = Game.market.getAllOrders({resourceType: minType, type: ORDER_BUY}).filter((order: Order) =>
					order.price >= threshold
					&& Game.map.getRoomLinearDistance(this.room.name, order.roomName) < 50 // At 70 the energy costs equal the amount to transfer.
				) as Order[];
				if (offers.length > 0) {
					const offer = _.sortBy(offers, "price").shift();
					const amount = global.clamp(offer.remainingAmount, 0, this.store[minType]);
					const status = Game.market.deal(offer.id, amount, this.room.name);
					if (status === OK) {
						console.log(global.colorWrap(`[MARKET] AutoSelling ${amount} ${minType} in ${this.room.name} at price ${offer.price}`
							+ ` - order ${offer.id}.`, "DeepPink"));
						this.sending = true;
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
	// TODO: x = total_amount/(1+(Math.log(0.1*linearDistanceBetweenRooms + 0.9) + 0.1))
	const batchSize: number = 1000;
	const roomList = _.filter(Game.rooms, (r: Room) => !!r.controller && !!r.controller.my && r.controller.level > 5 && !!r.storage && !!r.terminal);
	if (this.store.energy >= global.TERMINAL_ENERGY_MAX
		&& this.storage.store.energy >= (global.STORAGE_MIN + global.TERMINAL_ENERGY_MAX)
	) {
		// Find a room that needs energy.
		_.forEach(roomList, (room: Room) => {
			if (!this.sending
				&& room.name !== this.room.name
				&& !_.includes(global.sendRegistry, RESOURCE_ENERGY)
				&& room.storage.store.energy < (global.STORAGE_MIN - global.TERMINAL_ENERGY_MAX)
			) {
				const transferCosts: number = Game.market.calcTransactionCost(global.TERMINAL_ENERGY_MAX, this.room.name, room.name);
				const transferAmount: number = global.TERMINAL_ENERGY_MAX - transferCosts;
				const status = this.send(RESOURCE_ENERGY, transferAmount, room.name);
				if (status === OK) {
					this.sending = true;
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
		const powerRoom: Room = roomList.find((r: Room) => !!r.powerSpawn && r.storage.store.energy <= (2 * global.STORAGE_MIN));
		if (!this.sending && !!powerRoom && this.room.name !== powerRoom.name
			&& this.storage.store.energy > (2 * global.STORAGE_MIN)
		) {
			const transferCosts: number = Game.market.calcTransactionCost(global.TERMINAL_ENERGY_MAX, this.room.name, powerRoom.name);
			const transferAmount: number = global.TERMINAL_ENERGY_MAX - transferCosts;
			const status = this.send(RESOURCE_ENERGY, transferAmount, powerRoom.name);
			if (status === OK) {
				this.sending = true;
				global.sendRegistry.push(RESOURCE_ENERGY);
				console.log(`Terminal.SupplyForPower, sending ${RESOURCE_ENERGY} x ${transferAmount}`
					+ ` from ${this.room.name} to ${powerRoom.name}`);
			}else {
				console.log(`Terminal.SupplyForPower, error ${global.translateErrorCode(status)} while transferring`
					+ ` from ${this.room.name} to ${powerRoom.name}`);
			}
		}
	}

	let resourceBlacklist: string[] = global.TERMINAL_SKIP_BALANCE_RESOURCES;
	/**
	 * Supply rooms that have active BoostLabs with the required compound if they're low on that resource.
	 */
	global.boostReagents.forEach((br: any) => {
		resourceBlacklist.push(br.reagent);
		if (!this.sending && Game.cpu.bucket > global.BUCKET_MIN) {
			if (!this.sending
				&& br.room.name !== this.room.name
				&& !_.includes(global.sendRegistry, br.reagent)
				&& this.store[br.reagent] >= TERMINAL_MIN_SEND
				&& (!br.room.terminal.store[br.reagent] || br.room.terminal.store[br.reagent] < global.TERMINAL_MAX)
				&& !br.room.storage.store[br.reagent]
			) {
				let transferAmount: number = global.clamp(batchSize, TERMINAL_MIN_SEND, this.store[br.reagent]);
				const transferCosts: number = Game.market.calcTransactionCost(transferAmount, this.room.name, br.room.name);
				if (this.store.energy >= transferCosts) {
					const status = this.send(br.reagent, transferAmount, br.room.name);
					if (status === OK) {
						this.sending = true;
						global.sendRegistry.push(br.reagent);
						console.log(`Terminal.RefillBoost, sending ${br.reagent} x ${transferAmount}`
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
	/**
	 * Supply rooms that have a labReaction running with it's reagents if the room is low on either of those resources.
	 */
	global.labReactions.forEach((lr: any) => {
		resourceBlacklist = _.union(resourceBlacklist, lr.reagents);
		resourceBlacklist.push(lr.reaction);
		if (!this.sending && Game.cpu.bucket > global.BUCKET_MIN) {
			lr.reagents.forEach((reagent: string) => {
				if (!this.sending
					&& lr.room.name !== this.room.name
					&& !_.includes(global.sendRegistry, reagent)
					&& this.store[reagent] >= TERMINAL_MIN_SEND
					&& (!!this.room.labReagents && !_.includes(this.room.labReagents, reagent))
					&& (!lr.room.terminal.store[reagent] || lr.room.terminal.store[reagent] < global.TERMINAL_MAX)
					&& !lr.room.storage.store[reagent]
				) {
					let transferAmount: number = global.clamp(batchSize, TERMINAL_MIN_SEND, this.store[reagent]);
					const transferCosts: number = Game.market.calcTransactionCost(transferAmount, this.room.name, lr.room.name);
					if (this.store.energy >= transferCosts) {
						const status = this.send(reagent, transferAmount, lr.room.name);
						if (status === OK) {
							this.sending = true;
							global.sendRegistry.push(reagent);
							console.log(`Terminal.LabReaction, sending ${reagent} x ${transferAmount} to run ${lr.reaction}`
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
	if (!this.sending && Game.cpu.bucket > global.BUCKET_MIN) {
		let resources: string[] = _(RESOURCES_ALL).difference(resourceBlacklist).difference(global.sendRegistry).value();
		resources.forEach((resource: string) => {
			if (this.sending) {
				return;
			}
			if (!!this.storage.store[resource]
				&& this.storage.store[resource] > global.TERMINAL_MAX
				&& this.store[resource] >= global.TERMINAL_MAX
			) {
				_.forEach(roomList, (room: Room) => {
					if (!this.sending
						&& !room.storage.store[resource]
						&& (!room.terminal.store[resource] || room.terminal.store[resource] < global.TERMINAL_MAX)
					) {
						const transferCosts: number = Game.market.calcTransactionCost(batchSize, this.room.name, room.name);
						if (this.store.energy >= transferCosts) {
							const status = this.send(resource, batchSize, room.name);
							if (status === OK) {
								this.sending = true;
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
