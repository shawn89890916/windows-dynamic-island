import { describe, expect, it } from "bun:test";
import { chineseLunarDate, daysUntilNewYear, resolveFestiveTheme } from "./calendar";

describe("festive calendar", () => {
	it("recognizes Lunar New Year and updates the zodiac each year", () => {
		expect(chineseLunarDate(new Date(2026, 1, 17))).toMatchObject({ year: 2026, month: 1, day: 1, zodiac: "马" });
		expect(chineseLunarDate(new Date(2025, 0, 29))).toMatchObject({ year: 2025, month: 1, day: 1, zodiac: "蛇" });
		expect(resolveFestiveTheme({ themeMode: "auto" }, new Date(2026, 1, 20))).toBe("spring");
	});

	it("recognizes Mid-Autumn from the lunar calendar", () => {
		expect(chineseLunarDate(new Date(2025, 9, 6))).toMatchObject({ month: 8, day: 15 });
		expect(resolveFestiveTheme({ themeMode: "auto" }, new Date(2025, 9, 6))).toBe("mid-autumn");
	});

	it("automatically selects the fixed-date seasonal themes", () => {
		expect(resolveFestiveTheme({ themeMode: "auto" }, new Date(2026, 11, 24))).toBe("christmas");
		expect(resolveFestiveTheme({ themeMode: "auto" }, new Date(2026, 11, 31))).toBe("new-year");
		expect(resolveFestiveTheme({ themeMode: "auto" }, new Date(2026, 9, 31))).toBe("halloween");
	});

	it("applies a manual theme only during its selected date range", () => {
		const settings = {
			themeMode: "manual",
			manualTheme: "halloween",
			customStartDate: "2026-10-01",
			customEndDate: "2026-10-31",
		};
		expect(resolveFestiveTheme(settings, new Date(2026, 9, 1))).toBe("halloween");
		expect(resolveFestiveTheme(settings, new Date(2026, 10, 1))).toBeNull();
	});

	it("counts calendar days to New Year without time-of-day drift", () => {
		expect(daysUntilNewYear(new Date(2026, 11, 31, 23, 59))).toBe(1);
		expect(daysUntilNewYear(new Date(2027, 0, 1, 0, 1))).toBe(0);
	});
});
