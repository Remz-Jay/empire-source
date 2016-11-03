Array.prototype.filter = function(callback, thisArg) {
	let results: any[] = [];
	let arr = this;
	for (let iterator = 0; iterator < arr.length; iterator++) {
		if (callback.call(thisArg, arr[iterator], iterator, arr)) {
			results.push(arr[iterator]);
		}
	}
	return results;
};

Array.prototype.forEach = function(callback, thisArg) {
	let arr = this;
	for (let iterator = 0; iterator < arr.length; iterator++) {
		callback.call(thisArg, arr[iterator], iterator, arr);
	}
};

Array.prototype.map = function(callback: any, thisArg: any) {
	let arr = this;
	let returnVal: any[] = [];
	for (let iterator = 0; iterator < arr.length; iterator++) {
		returnVal.push(callback.call(thisArg, arr[iterator], iterator, arr));
	}
	return returnVal;
};
