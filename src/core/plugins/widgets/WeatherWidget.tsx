import { CloudRainIcon, CloudSunIcon, DropletsIcon, SunIcon, ThermometerIcon, WindIcon } from "lucide-react";
import { useT } from "../../../core/i18n";

export function WeatherWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const city = String(settings.city || "Beijing");

	const forecast = [
		{ day: t("marketplace.widgets.weather.today"), temp: "22°/11°", icon: "sun" },
		{ day: t("marketplace.widgets.weather.tomorrow"), temp: "19°/9°", icon: "cloud-sun" },
		{ day: t("marketplace.widgets.weather.dayAfter"), temp: "16°/8°", icon: "cloud-rain" },
	];

	return (
		<div className="flex h-full items-center justify-between px-3 select-none">
			{/* Left Column: City, AQI, Hero Temp & Condition (Zero horizontal overlap) */}
			<div className="flex w-[185px] shrink-0 items-center gap-3">
				<div className="flex size-11.5 shrink-0 items-center justify-center rounded-2xl bg-sky-500/18 text-sky-400">
					<SunIcon size={24} className="text-amber-400" />
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-1.5">
						<span className="text-[13px] font-semibold text-text truncate">{city}</span>
						<span className="rounded-full bg-emerald-500/18 px-1.5 py-0.2 text-[9.5px] font-medium text-emerald-400 shrink-0 whitespace-nowrap">
							{t("marketplace.widgets.weather.airQuality", { aqi: 32 })}
						</span>
					</div>
					<div className="mt-0.5 flex items-baseline">
						<span className="font-mono text-[28px]/[1] font-bold text-text tabular-nums">22</span>
						<span className="text-sm font-medium text-text-faint">°C</span>
					</div>
					<span className="text-[11px] text-text-faint truncate">{t("marketplace.widgets.weather.partlyCloudy")}</span>
				</div>
			</div>

			{/* Center Column: Clear Meteorological Metrics */}
			<div className="flex w-[140px] shrink-0 flex-col gap-1.5 border-x border-white/8 px-3.5 text-xs text-text-faint">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-text-muted">
						<ThermometerIcon size={12} className="text-amber-400 shrink-0" />
						<span className="text-[11px] whitespace-nowrap">{t("marketplace.widgets.weather.feelsLike")}</span>
					</div>
					<span className="font-mono text-[11px] font-semibold text-text tabular-nums">21°C</span>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-text-muted">
						<DropletsIcon size={12} className="text-sky-400 shrink-0" />
						<span className="text-[11px] whitespace-nowrap">{t("marketplace.widgets.weather.humidity")}</span>
					</div>
					<span className="font-mono text-[11px] font-semibold text-text tabular-nums">45%</span>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-text-muted">
						<WindIcon size={12} className="text-emerald-400 shrink-0" />
						<span className="text-[11px] whitespace-nowrap">{t("marketplace.widgets.weather.wind")}</span>
					</div>
					<span className="font-mono text-[11px] font-medium text-text tabular-nums">12 km/h</span>
				</div>
			</div>

			{/* Right Column: 3-Day Forecast Cards */}
			<div className="flex shrink-0 items-center gap-2">
				{forecast.map((f) => (
					<div
						key={f.day}
						className="flex flex-col items-center rounded-xl bg-white/4 border border-white/6 px-2.5 py-1.5 text-center min-w-[58px]"
					>
						<span className="text-[10px] text-text-faint whitespace-nowrap">{f.day}</span>
						<div className="my-1">
							{f.icon === "sun" ? (
								<SunIcon size={14} className="text-amber-400" />
							) : f.icon === "cloud-sun" ? (
								<CloudSunIcon size={14} className="text-sky-400" />
							) : (
								<CloudRainIcon size={14} className="text-blue-400" />
							)}
						</div>
						<span className="font-mono text-[10.5px] font-bold text-text tabular-nums whitespace-nowrap">{f.temp}</span>
					</div>
				))}
			</div>
		</div>
	);
}
