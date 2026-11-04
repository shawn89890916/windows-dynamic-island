import { expect, test } from "bun:test";
import { dailyNoteName, quickCaptureName } from "./obsidianDailyNote";

test("daily notes default to zero-padded local year-month-day", () => {
	expect(dailyNoteName(new Date(2026, 0, 3))).toBe("2026-01-03");
	expect(dailyNoteName(new Date(2026, 10, 3), "YYYY年MM月DD日")).toBe("2026年11月03日");
	expect(dailyNoteName(new Date(2026, 10, 3), "YYYY/MM/DD")).toBe("2026/11/03");
});
test("quick captures default to a date filename and support custom date/time tokens", () => {
	const date = new Date(2026, 10, 3, 20, 15, 22);
	expect(quickCaptureName(date)).toBe("2026-11-03");
	expect(quickCaptureName(date, "YYYY-MM-DD-HH-mm-ss")).toBe("2026-11-03-20-15-22");
});
test("daily names reject path traversal, absolute paths, unsupported tokens and invalid filenames", () => {
	for (const pattern of ["../YYYY", "/YYYY-MM-DD", "C:/YYYY", "YYYY:MM:DD", "YY-M-D", "YYYY\nMM"]) {
		expect(() => dailyNoteName(new Date(), pattern)).toThrow();
	}
});
