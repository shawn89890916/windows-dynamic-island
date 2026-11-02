import { CloudRainIcon, CloudSunIcon, DropletsIcon, SunIcon, WindIcon } from "lucide-react";
import { useState } from "react";

export function WeatherWidget({ settings }: { settings: Record<string, unknown> }) {
	const city = String(settings.city || "Beijing");

	const [forecast] = useState([
		{ day: "今天", temp: "22° / 11°", text: "晴朗", icon: "sun" },
		{ day: "明天", temp: "19° / 9°", text: "多云", icon: "cloud-sun" },
		{ day: "后天", temp: "16° / 8°", text: "小雨", icon: "cloud-rain" },
	]);

	return (
		<div className="flex h-full items-center justify-between px-3 select-none">
			{/* Leading: Hero Weather Icon, City & Temperature */}
			<div className="flex min-w-0 items-center gap-3.5">
				<div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-sky-500/18 text-sky-400">
					<SunIcon size={26} className="text-amber-400" />
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-2">
						<span className="text-sm font-semibold text-text">{city}</span>
						<span className="rounded-full bg-emerald-500/18 px-2 py-0.2 text-[10.5px] font-medium text-emerald-400">
							空气优 32
						</span>
					</div>
					<div className="mt-0.5 flex items-baseline gap-1">
						<span className="font-mono text-[30px]/[1.1] font-bold text-text tabular-nums">22</span>
						<span className="text-base text-text-faint">°C</span>
						<span className="ml-1 text-xs text-text-faint">晴间多云</span>
					</div>
				</div>
			</div>

			{/* Center: Meteorological Details */}
			<div className="flex flex-col gap-1.5 border-x border-white/8 px-5 text-xs text-text-faint">
				<div className="flex items-center gap-2">
					<span className="text-text-muted">体感温度</span>
					<span className="font-mono font-semibold text-text">21°C</span>
				</div>
				<div className="flex items-center gap-2">
					<DropletsIcon size={12} className="text-sky-400" />
					<span className="text-text-muted">相对湿度</span>
					<span className="font-mono font-semibold text-text">45%</span>
				</div>
				<div className="flex items-center gap-2">
					<WindIcon size={12} className="text-emerald-400" />
					<span className="text-text-muted">风向风力</span>
					<span className="font-medium text-text">微风 2级</span>
				</div>
			</div>

			{/* Trailing: 3-Day Forecast Strip */}
			<div className="flex flex-none items-center gap-2">
				{forecast.map((f) => (
					<div
						key={f.day}
						className="flex flex-col items-center rounded-xl bg-white/4 border border-white/5 px-2.5 py-1.5 text-center min-w-[62px]"
					>
						<span className="text-[10.5px] text-text-faint">{f.day}</span>
						<div className="my-1">
							{f.icon === "sun" ? (
								<SunIcon size={15} className="text-amber-400" />
							) : f.icon === "cloud-sun" ? (
								<CloudSunIcon size={15} className="text-sky-400" />
							) : (
								<CloudRainIcon size={15} className="text-blue-400" />
							)}
						</div>
						<span className="font-mono text-[11px] font-bold text-text tabular-nums">{f.temp}</span>
					</div>
				))}
			</div>
		</div>
	);
}
