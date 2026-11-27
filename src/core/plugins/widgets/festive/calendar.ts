export const FESTIVE_THEMES = ["christmas", "spring", "new-year", "mid-autumn", "halloween"] as const;
export type FestiveTheme = (typeof FESTIVE_THEMES)[number];

const zodiacAnimals = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const chineseCalendar = new Intl.DateTimeFormat("en-u-ca-chinese", {
	year: "numeric",
	month: "numeric",
	day: "numeric",
	timeZone: "UTC",
});

export interface ChineseLunarDate {
	year: number;
	month: number;
	day: number;
	zodiac: string;
}

/** Use a local calendar day while keeping Intl's lunar calculation timezone stable. */
export function chineseLunarDate(date: Date): ChineseLunarDate {
	const stableDay = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
	const parts = Object.fromEntries(chineseCalendar.formatToParts(stableDay).map(({ type, value }) => [type, value]));
	const year = Number(parts.relatedYear || date.getFullYear());
	const month = Number.parseInt(parts.month, 10);
	const day = Number.parseInt(parts.day, 10);
	if (!Number.isFinite(month) || !Number.isFinite(day)) throw Error("当前运行环境不支持农历日期");
	return { year, month, day, zodiac: zodiacAnimals[(((year - 4) % 12) + 12) % 12] };
}

export function daysUntilNewYear(date: Date) {
	const year = date.getFullYear() + (date.getMonth() === 0 && date.getDate() === 1 ? 0 : 1);
	const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
	const next = Date.UTC(year, 0, 1);
	return Math.max(0, Math.ceil((next - today) / 86_400_000));
}

function inCustomRange(date: Date, start: string, end: string) {
	const current = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`));
	if ((start && !valid(start)) || (end && !valid(end)) || (start && end && start > end)) return false;
	return (!start || current >= start) && (!end || current <= end);
}

export function resolveFestiveTheme(settings: Record<string, unknown>, date: Date) {
	const selected = FESTIVE_THEMES.includes(settings.manualTheme as FestiveTheme)
		? (settings.manualTheme as FestiveTheme)
		: "christmas";
	const start = String(settings.customStartDate || "");
	const end = String(settings.customEndDate || "");
	const hasRange = Boolean(start || end);
	if (hasRange && inCustomRange(date, start, end)) return selected;
	if (settings.themeMode === "manual") return hasRange ? null : selected;

	const month = date.getMonth() + 1;
	const day = date.getDate();
	if ((month === 12 && day >= 27) || (month === 1 && day <= 2)) return "new-year" as const;
	if (month === 12 && day <= 26) return "christmas" as const;
	if (month === 10 && day >= 20) return "halloween" as const;
	let lunar: ChineseLunarDate;
	try {
		lunar = chineseLunarDate(date);
	} catch {
		return null;
	}
	if (lunar.month === 1 && lunar.day <= 7) return "spring" as const;
	if (lunar.month === 8 && lunar.day >= 13 && lunar.day <= 17) return "mid-autumn" as const;
	return null;
}

export function isFestiveTheme(value: unknown): value is FestiveTheme {
	return typeof value === "string" && FESTIVE_THEMES.some((theme) => theme === value);
}
