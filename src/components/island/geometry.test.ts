import { describe, expect, it } from "bun:test";
import { fitSeparatedCapsules, SEPARATED_NOTCH_WIDTH, SEPARATED_OVERFLOW_WIDTH } from "./geometry";

describe("separated capsule layout", () => {
	it("keeps two tasks and a status ring within the available row", () => {
		expect(fitSeparatedCapsules(2, 320, SEPARATED_NOTCH_WIDTH, 32)).toEqual({ visible: 2, overflow: 0 });
	});

	it("folds excess tasks into a compact overflow capsule", () => {
		expect(fitSeparatedCapsules(3, 214, SEPARATED_NOTCH_WIDTH)).toEqual({ visible: 1, overflow: 2 });
		expect(SEPARATED_OVERFLOW_WIDTH).toBeLessThan(SEPARATED_NOTCH_WIDTH);
	});

	it("uses only the overflow affordance when there is not enough room for a task capsule", () => {
		expect(fitSeparatedCapsules(3, 90, SEPARATED_NOTCH_WIDTH)).toEqual({ visible: 0, overflow: 3 });
	});
});
