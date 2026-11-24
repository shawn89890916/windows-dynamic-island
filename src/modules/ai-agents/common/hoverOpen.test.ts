import { describe, expect, test } from "bun:test";
import { scheduleHoverOpen } from "./hoverOpen";

describe("session hover open", () => {
	test("opens the hovered session after a short pause", async () => {
		let opened = false;
		scheduleHoverOpen(() => {
			opened = true;
		}, 5);

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(opened).toBe(true);
	});

	test("cancels opening when the pointer leaves the session", async () => {
		let opened = false;
		const cancel = scheduleHoverOpen(() => {
			opened = true;
		}, 5);
		cancel();

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(opened).toBe(false);
	});
});
