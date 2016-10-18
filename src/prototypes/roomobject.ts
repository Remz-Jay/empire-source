interface RoomObject {
	safeLook(lookFor: string, range: number): LookAtResultWithPos[];
}

Object.defineProperty(RoomObject.prototype, "safeLook", {
	value: function(lookFor: string, range: number = 1): LookAtResultWithPos[] {
		const positions: any = {
			top: this.pos.y - range,
			left: this.pos.x - range,
			bottom: this.pos.y + range,
			right: this.pos.x + range,
		};
		_.forOwn(positions, (val: number, key: any) => {
			if (val < 1) {
				positions[key] = 1;
			}
			if (val > 48) {
				positions[key] = 48;
			}
		});
		return this.room.lookForAtArea(lookFor, positions.top, positions.left, positions.bottom, positions.right, true) as LookAtResultWithPos[];
	},
	enumerable: false,
	configurable: true,
});
