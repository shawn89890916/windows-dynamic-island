import { CloudRainIcon, CloudSunIcon, DropletsIcon, SunIcon, WindIcon } from "lucide-react";
import { useT } from "../../../core/i18n";

export function WeatherWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const city = String(settings.city || "Beijing");

	const forecast = [
		{ day: t("marketplace.widgets.weather.today"), temp: "22° / 11°", icon: "sun" },
		{ day: t("marketplace.widgets.weather.tomorrow"), temp: "19° / 9°", icon: "cloud-sun" },
		{ day: t("marketplace.widgets.weather.dayAfter"), temp: "16° / 8°", icon: "cloud-rain" },
	];

	return (
		<div className="flex h-full items-center justify-between px-3 select-none">
			{/* Leading: Hero Weather Icon, City & Temperature */}
			<div className="flex min-w-0 items-center gap-3.5">
				<div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/18 text-sky-400">
					<SunIcon size={26} className="text-amber-400" />
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-2">
						<span className="text-sm font-semibold text-text truncate">{city}</span>
						<span className="rounded-full bg-emerald-500/18 px-2 py-0.5 text-[10px] font-medium text-emerald-400 shrink-0 whitespace-nowrap">
							{t("marketplace.widgets.weather.airQuality", { aqi: 32 })}
						</span>
					</div>
					<div className="mt-0.5 flex items-baseline gap-1">
						<span className="font-mono text-[30px]/[1.1] font-bold text-text tabular-nums">22</span>
						<span className="text-base text-text-faint">°C</span>
						<span className="ml-1 text-xs text-text-faint whitespace-nowrap">
							{t("marketplace.widgets.weather.partlyCloudy")}
						</span>
					</div>
				</div>
			</div>

			{/* Center: Meteorological Details (Flexible & Language Resilient) */}
			<div className="flex flex-col gap-1.5 border-x border-white/8 px-4 text-xs text-text-faint shrink-0">
				<div className="flex items-center justify-between gap-3">
					<span className="text-text-muted whitespace-nowrap">{t("marketplace.widgets.weather.feelsLike")}</span>
					<span className="font-mono font-semibold text-text whitespace-nowrap">21°C</span>
				</div>
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-1.5">
						<DropletsIcon size={12} className="text-sky-400" />
						<span className="text-text-muted whitespace-nowrap">{t("marketplace.widgets.weather.humidity")}</span>
					</div>
					<span className="font-mono font-semibold text-text whitespace-nowrap">45%</span>
				</div>
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-1.5">
						<WindIcon size={12} className="text-emerald-400" />
						<span className="text-text-muted whitespace-nowrap">{t("marketplace.widgets.weather.wind")}</span>
					</div>
					<span className="font-medium text-text whitespace-nowrap">12 km/h</span>
				</div>
			</div>

			{/* Trailing: 3-Day Forecast Strip */}
			<div className="flex shrink-0 items-center gap-2">
				{forecast.map((f) => (
					<div
						key={f.day}
						className="flex flex-col items-center rounded-xl bg-white/4 border border-white/5 px-2.5 py-1.5 text-center min-w-[62px]"
					>
						<span className="text-[10.5px] text-text-faint whitespace-nowrap">{f.day}</span>
						<div className="my-1">
							{f.icon === "sun" ? (
								<SunIcon size={15} className="text-amber-400" />
							) : f.icon === "cloud-sun" ? (
								<CloudSunIcon size={15} className="text-sky-400" />
							) : (
								<CloudRainIcon size={15} className="text-blue-400" />
							)}
						</div>
						<span className="font-mono text-[11px] font-bold text-text tabular-nums whitespace-nowrap">{f.temp}</span>
					</div>
				))}
			</div>
		</div>
	);
}
