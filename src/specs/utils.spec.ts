import { expect } from "chai";
import * as _ from "lodash";
import "../shared/utils";
console.log(`Using lodash ` + _.VERSION);
describe("global.formatNumber", () => {
	it("should convert numbers to strings", (done: MochaDone) => {
		expect(global.formatNumber(100)).to.equal("100");
		expect(global.formatNumber(1000)).to.equal("1k");
		expect(global.formatNumber(1000000)).to.equal("1M");
		done();
	});
	it("should convert negative numbers", (done: MochaDone) => {
		expect(global.formatNumber(-100)).to.equal("-100");
		expect(global.formatNumber(-1000)).to.equal("-1k");
		expect(global.formatNumber(-1000000)).to.equal("-1M");
		done();
	});
	it("should not error out when undefined is passed", (done: MochaDone) => {
		expect(global.formatNumber(undefined)).to.equal(undefined);
		done();
	});
});
describe("global.colorWrap", () => {
	it("should wrap a string in HTML", (done: MochaDone) => {
		const input: string = "hello";
		const color: string = "Red";
		expect(global.colorWrap(input, color)).to.include("<font color")
			.and.include(input)
			.and.include(color)
			.and.include("</font>");
		done();
	});
	it("should not error out when undefined is passed", (done: MochaDone) => {
		const input: string = undefined;
		const color: string = undefined;
		expect(global.colorWrap(input, color)).to.include("<font color")
			.and.include(input)
			.and.include(color)
			.and.include("</font>");
		done();
	});
});
