import { CloudRainIcon, CloudSunIcon, DropletsIcon, SunIcon, WindIcon } from "lucide-react";
import { useState } from "react";

export function WeatherWidget({ settings }: { settings: Record<string, unknown> }) {
	const city = String(settings.city || "Beijing");

	const [forecast] = useState([
		{ day: "今天", temp: "22°", icon: "sun" },
		{ day: "明天", temp: "19°", icon: "cloud-sun" },
		{ day: "后天", temp: "16°", icon: "cloud-rain" },
	]);

	return (
		<div className="flex h-full items-center justify-between px-2 select-none">
			{/* Leading: Hero Weather Icon & City Info */}
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex size-11 flex-none items-center justify-center rounded-2xl bg-sky-500/16 text-sky-400">
					<SunIcon size={22} className="text-amber-400" />
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-1.5">
						<span className="text-[13px] font-semibold text-text">{city}</span>
						<span className="rounded-full bg-emerald-500/18 px-1.5 py-0.2 text-[10px] font-medium text-emerald-400">
							空气优 32
						</span>
					</div>
					<span className="mt-0.5 text-[11px] text-text-faint">晴间多云 · 适宜出行</span>
				</div>
			</div>

			{/* Center: Large Temperature + Metrics */}
			<div className="flex flex-col items-center justify-center px-4">
				<div className="flex items-baseline gap-0.5">
					<span className="font-mono text-[30px]/[1.1] font-bold tracking-tight text-text tabular-nums">22</span>
					<span className="text-[18px] font-medium text-text-faint">°C</span>
				</div>
				<div className="mt-1 flex items-center gap-2.5 text-[11px] text-text-faint">
					<span className="flex items-center gap-1">
						<DropletsIcon size={11} className="text-sky-400" />
						45%
					</span>
					<span className="text-white/20">·</span>
					<span className="flex items-center gap-1">
						<WindIcon size={11} className="text-emerald-400" />
						微风 2级
					</span>
				</div>
			</div>

			{/* Trailing: 3-Day Forecast Capsules */}
			<div className="flex flex-none items-center gap-1.5">
				{forecast.map((f) => (
					<div
						key={f.day}
						className="flex flex-col items-center rounded-xl bg-white/6 px-2.5 py-1 text-center border border-white/6"
					>
						<span className="text-[10px] text-text-faint">{f.day}</span>
						<div className="my-0.5">
							{f.icon === "sun" ? (
								<SunIcon size={13} className="text-amber-400" />
							) : f.icon === "cloud-sun" ? (
								<CloudSunIcon size={13} className="text-sky-400" />
							) : (
								<CloudRainIcon size={13} className="text-blue-400" />
							)}
						</div>
						<span className="font-mono text-[11px] font-bold text-text tabular-nums">{f.temp}</span>
					</div>
				))}
			</div>
		</div>
	);
}
