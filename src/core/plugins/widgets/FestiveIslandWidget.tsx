import { useEffect, useMemo, useState } from "react";
import { type MessageKey, useT } from "../../i18n";
import type { IslandOverlayLayout } from "../types";
import { ChristmasSkin } from "./festive/ChristmasSkin";
import {
	chineseLunarDate,
	daysUntilNewYear,
	type FestiveTheme,
	isFestiveTheme,
	resolveFestiveTheme,
} from "./festive/calendar";
import { HalloweenSkin } from "./festive/HalloweenSkin";
import { MidAutumnSkin } from "./festive/MidAutumnSkin";
import { NewYearSkin } from "./festive/NewYearSkin";
import { SpringSkin } from "./festive/SpringSkin";

const THEME_KEYS: Record<FestiveTheme, MessageKey> = {
	christmas: "marketplace.widgets.festiveIsland.themeChristmas",
	spring: "marketplace.widgets.festiveIsland.themeSpring",
	"new-year": "marketplace.widgets.festiveIsland.themeNewYear",
	"mid-autumn": "marketplace.widgets.festiveIsland.themeMidAutumn",
	halloween: "marketplace.widgets.festiveIsland.themeHalloween",
};

const SAMPLE_LAYOUT: IslandOverlayLayout = {
	mode: "compact",
	style: "dynamic",
	attachedNotch: false,
	macCompact: false,
	separated: true,
	groupWidth: 360,
	groupHeight: 46,
	main: { x: 0, y: 0, width: 230, height: 46, shape: "pill", role: "main" },
	side: [{ x: 244, y: 4, width: 112, height: 38, shape: "pill", role: "task" }],
};

function FestivalSkin({
	theme,
	settings,
	layout,
}: {
	theme: FestiveTheme;
	settings: Record<string, unknown>;
	layout: IslandOverlayLayout;
}) {
	const props = {
		layout,
		settings,
		zodiac: chineseLunarDate(new Date()).zodiac,
		daysToNewYear: daysUntilNewYear(new Date()),
	};
	switch (theme) {
		case "christmas":
			return <ChristmasSkin {...props} />;
		case "spring":
			return <SpringSkin {...props} />;
		case "new-year":
			return <NewYearSkin {...props} />;
		case "mid-autumn":
			return <MidAutumnSkin {...props} />;
		case "halloween":
			return <HalloweenSkin {...props} />;
	}
}

function themedLayout(layout: IslandOverlayLayout): IslandOverlayLayout {
	if (!layout.macCompact) return layout;
	return {
		...layout,
		main: { ...layout.main, shape: "pill" },
		side: layout.side.map((rect) => ({ ...rect, shape: rect.shape === "notch" ? "pill" : rect.shape })),
	};
}

export function FestiveIslandAppearance({
	settings,
	layout,
}: {
	settings: Record<string, unknown>;
	layout: IslandOverlayLayout;
}) {
	const [today, setToday] = useState(() => new Date());
	useEffect(() => {
		const timer = window.setInterval(() => setToday(new Date()), 60_000);
		return () => window.clearInterval(timer);
	}, []);
	const theme = resolveFestiveTheme(settings, today);
	if (!theme || !isFestiveTheme(theme)) return null;
	if (layout.attachedNotch && layout.mode !== "expanded" && layout.mode !== "peek") return null;
	return <FestivalSkin theme={theme} settings={settings} layout={themedLayout(layout)} />;
}

export function FestiveIslandConfigure({
	settings,
	onChange,
}: {
	settings: Record<string, unknown>;
	onChange: (key: string, value: unknown) => void;
}) {
	const t = useT();
	const themeLabel = (value: FestiveTheme) => t(THEME_KEYS[value]);
	const theme = isFestiveTheme(settings.manualTheme) ? settings.manualTheme : "christmas";
	const previewSettings = useMemo(
		() => ({ ...settings, backgroundMode: settings.backgroundMode ?? "preserve" }),
		[settings],
	);
	const today = new Date();
	const actualTheme = resolveFestiveTheme(settings, today);
	const previewTheme = settings.themeMode === "manual" ? theme : isFestiveTheme(actualTheme) ? actualTheme : theme;
	const label = (key: MessageKey, fallback: string) => (t(key) === key ? fallback : t(key));
	const title = label("marketplace.widgets.festiveIsland.configureTitle", "Festive Island");
	const set = (key: string, value: unknown) => onChange(key, value);
	const boolSetting = (key: string, text: string, initial = true) => (
		<label key={key} className="flex min-h-9 items-center justify-between gap-3 text-xs text-text-dim">
			<span>{text}</span>
			<input
				type="checkbox"
				checked={settings[key] === undefined ? initial : Boolean(settings[key])}
				onChange={(event) => set(key, event.target.checked)}
				className="size-4 accent-violet-400"
			/>
		</label>
	);
	return (
		<div className="flex flex-col gap-4 text-text">
			<div>
				<h3 className="text-sm font-semibold">{title}</h3>
				<p className="mt-1 text-xs text-text-dim">
					{label(
						"marketplace.widgets.festiveIsland.configureDesc",
						"Choose a seasonal skin. Decorations are drawn as light SVG overlays and never change your base appearance settings.",
					)}
				</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<label className="flex flex-col gap-1.5 text-xs text-text-dim">
					<span>{label("marketplace.widgets.festiveIsland.mode", "Theme switching")}</span>
					<select
						value={String(settings.themeMode ?? "auto")}
						onChange={(event) => set("themeMode", event.target.value)}
						className="h-9 rounded-lg border border-white/10 bg-[#17171b] px-2.5 text-text"
					>
						<option value="auto">{label("marketplace.widgets.festiveIsland.auto", "Automatic")}</option>
						<option value="manual">{label("marketplace.widgets.festiveIsland.manual", "Manual")}</option>
					</select>
				</label>
				<label className="flex flex-col gap-1.5 text-xs text-text-dim">
					<span>{label("marketplace.widgets.festiveIsland.theme", "Festival")}</span>
					<select
						value={theme}
						onChange={(event) => set("manualTheme", event.target.value)}
						className="h-9 rounded-lg border border-white/10 bg-[#17171b] px-2.5 text-text"
					>
						{Object.keys(THEME_KEYS).map((value) => (
							<option key={value} value={value}>
								{themeLabel(value as FestiveTheme)}
							</option>
						))}
					</select>
				</label>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<label className="flex flex-col gap-1.5 text-xs text-text-dim">
					<span>{label("marketplace.widgets.festiveIsland.start", "Custom start date")}</span>
					<input
						type="date"
						value={String(settings.customStartDate ?? "")}
						onChange={(event) => set("customStartDate", event.target.value)}
						className="h-9 rounded-lg border border-white/10 bg-[#17171b] px-2.5 text-text"
					/>
				</label>
				<label className="flex flex-col gap-1.5 text-xs text-text-dim">
					<span>{label("marketplace.widgets.festiveIsland.end", "Custom end date")}</span>
					<input
						type="date"
						value={String(settings.customEndDate ?? "")}
						onChange={(event) => set("customEndDate", event.target.value)}
						className="h-9 rounded-lg border border-white/10 bg-[#17171b] px-2.5 text-text"
					/>
				</label>
			</div>
			<div className="grid gap-x-5 sm:grid-cols-2">
				{boolSetting("decorations", label("marketplace.widgets.festiveIsland.decorations", "Decorative elements"))}
				{boolSetting("effects", label("marketplace.widgets.festiveIsland.effects", "Motion effects"))}
				{boolSetting("showHat", label("marketplace.widgets.festiveIsland.hat", "Christmas hat"))}
				{boolSetting("showSnow", label("marketplace.widgets.festiveIsland.snow", "Snow"))}
				{boolSetting("showLights", label("marketplace.widgets.festiveIsland.lights", "Christmas lights"))}
				{boolSetting("showClouds", label("marketplace.widgets.festiveIsland.clouds", "Clouds and lantern"))}
				{boolSetting("showZodiac", label("marketplace.widgets.festiveIsland.zodiac", "Chinese zodiac"))}
				{boolSetting("showMoon", label("marketplace.widgets.festiveIsland.moon", "Moon and stars"))}
				{boolSetting("showStars", label("marketplace.widgets.festiveIsland.stars", "Mid-Autumn stars"))}
				{boolSetting("showRabbit", label("marketplace.widgets.festiveIsland.rabbit", "Jade rabbit"))}
				{boolSetting("showConfetti", label("marketplace.widgets.festiveIsland.confetti", "Confetti"))}
				{boolSetting("showPumpkin", label("marketplace.widgets.festiveIsland.pumpkin", "Pumpkin"))}
				{boolSetting("showGhost", label("marketplace.widgets.festiveIsland.ghost", "Ghost"))}
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<label className="flex flex-col gap-1.5 text-xs text-text-dim">
					<span>
						{label("marketplace.widgets.festiveIsland.particles", "Particle count")} ·{" "}
						{Number(settings.particleCount ?? 14)}
					</span>
					<input
						type="range"
						min="0"
						max="36"
						value={Number(settings.particleCount ?? 14)}
						onChange={(event) => set("particleCount", Number(event.target.value))}
					/>
				</label>
				<label className="flex flex-col gap-1.5 text-xs text-text-dim">
					<span>
						{label("marketplace.widgets.festiveIsland.speed", "Animation speed")} ·{" "}
						{Number(settings.animationSpeed ?? 1).toFixed(1)}×
					</span>
					<input
						type="range"
						min="0.5"
						max="2"
						step="0.1"
						value={Number(settings.animationSpeed ?? 1)}
						onChange={(event) => set("animationSpeed", Number(event.target.value))}
					/>
				</label>
				<label className="flex flex-col gap-1.5 text-xs text-text-dim sm:col-span-2">
					<span>{label("marketplace.widgets.festiveIsland.background", "Island background")}</span>
					<select
						value={String(settings.backgroundMode ?? "preserve")}
						onChange={(event) => set("backgroundMode", event.target.value)}
						className="h-9 rounded-lg border border-white/10 bg-[#17171b] px-2.5 text-text"
					>
						<option value="preserve">{label("marketplace.widgets.festiveIsland.preserve", "Keep original")}</option>
						<option value="festive">{label("marketplace.widgets.festiveIsland.palette", "Use festival colors")}</option>
					</select>
				</label>
			</div>
			<div className="overflow-hidden rounded-xl border border-white/8 bg-[#08080a]">
				<div className="px-3 pt-3 text-[11px] font-medium text-text-dim">
					{label("marketplace.widgets.festiveIsland.preview", "Live preview")} · {themeLabel(previewTheme)}
				</div>
				<div className="relative mx-auto my-4 h-[58px] w-[360px] max-w-full">
					<div className="absolute left-0 top-1 h-[46px] w-[230px] rounded-full bg-black" />
					<div className="absolute left-[244px] top-[5px] h-[38px] w-[112px] rounded-full bg-black" />
					<FestivalSkin theme={previewTheme} settings={previewSettings} layout={SAMPLE_LAYOUT} />
				</div>
			</div>
			{previewTheme === "new-year" && (
				<p className="text-[11px] text-text-faint">
					{t("marketplace.widgets.festiveIsland.countdown", { days: daysUntilNewYear(today) })}
				</p>
			)}
		</div>
	);
}

export function FestiveIslandWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const theme = resolveFestiveTheme(settings, new Date());
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 text-center">
			{theme ? (
				<div className="relative h-[58px] w-[360px] max-w-full">
					<div className="absolute left-0 top-1 h-[46px] w-[230px] rounded-full bg-black" />
					<div className="absolute left-[244px] top-[5px] h-[38px] w-[112px] rounded-full bg-black" />
					<FestivalSkin theme={theme} settings={settings} layout={SAMPLE_LAYOUT} />
				</div>
			) : null}
			<p className="text-sm font-semibold">{t("marketplace.plugins.festiveIsland.name")}</p>
			<p className="text-xs text-text-dim">
				{theme ? t(THEME_KEYS[theme]) : t("marketplace.widgets.festiveIsland.noTheme")}
			</p>
			{theme === "new-year" && (
				<p className="text-xs text-text-faint">
					{t("marketplace.widgets.festiveIsland.countdown", { days: daysUntilNewYear(new Date()) })}
				</p>
			)}
		</div>
	);
}
