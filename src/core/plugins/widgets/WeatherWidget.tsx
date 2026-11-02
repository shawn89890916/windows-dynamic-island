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
		<div className="flex h-full flex-col justify-between p-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-white/8 pb-3">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
						<CloudSunIcon size={16} />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-text">{city} 实时天气</h3>
						<p className="text-[11px] text-text-faint">今日空气质量优 · 适宜户外活动</p>
					</div>
				</div>

				<span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
					AQI 32 优
				</span>
			</div>

			{/* Center Current Weather Info */}
			<div className="my-auto flex items-center justify-between px-2">
				<div className="flex items-center gap-3">
					<SunIcon size={44} className="text-amber-400" />
					<div>
						<div className="flex items-baseline gap-1">
							<span className="font-mono text-3xl font-bold text-text">22</span>
							<span className="text-lg text-text-faint">°C</span>
						</div>
						<div className="text-xs text-text-faint">晴 · 体感 21°C</div>
					</div>
				</div>

				<div className="flex flex-col gap-1.5 text-right text-xs text-text-faint">
					<div className="flex items-center justify-end gap-1.5">
						<DropletsIcon size={13} className="text-sky-400" />
						<span>相对湿度 45%</span>
					</div>
					<div className="flex items-center justify-end gap-1.5">
						<WindIcon size={13} className="text-emerald-400" />
						<span>东北风 2级 微风</span>
					</div>
				</div>
			</div>

			{/* 3-Day Forecast Strip */}
			<div className="grid grid-cols-3 gap-2 border-t border-white/6 pt-2.5">
				{forecast.map((f) => (
					<div key={f.day} className="flex items-center justify-between rounded-lg bg-white/3 px-3 py-1.5 text-xs">
						<span className="font-medium text-text">{f.day}</span>
						<span className="flex items-center gap-1 text-[11px] text-text-faint">
							{f.icon === "sun" ? (
								<SunIcon size={12} className="text-amber-400" />
							) : f.icon === "cloud-rain" ? (
								<CloudRainIcon size={12} className="text-sky-400" />
							) : (
								<CloudSunIcon size={12} className="text-sky-300" />
							)}
							<span>{f.text}</span>
						</span>
						<span className="font-mono text-[11px] text-text-muted">{f.temp}</span>
					</div>
				))}
			</div>
		</div>
	);
}
