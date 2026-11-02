import { CoffeeIcon, PartyPopperIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function WorkCountdownWidget({ settings }: { settings: Record<string, unknown> }) {
	const offTimeStr = String(settings.offWorkTime ?? "18:00");
	const startTimeStr = String(settings.workStartTime ?? "09:00");

	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);

	const [offHour, offMin] = offTimeStr.split(":").map(Number);
	const [startHour, startMin] = startTimeStr.split(":").map(Number);

	const targetToday = new Date(now);
	targetToday.setHours(offHour, offMin, 0, 0);

	const startToday = new Date(now);
	startToday.setHours(startHour, startMin, 0, 0);

	const diffMs = targetToday.getTime() - now.getTime();
	const isOffWork = diffMs <= 0;

	const totalWorkSpan = targetToday.getTime() - startToday.getTime();
	const elapsedSpan = Math.max(0, now.getTime() - startToday.getTime());
	const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedSpan / (totalWorkSpan || 1)) * 100)));

	const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
	const remHours = Math.floor(remainingSeconds / 3600);
	const remMinutes = Math.floor((remainingSeconds % 3600) / 60);
	const remSecs = remainingSeconds % 60;

	const dayOfWeek = now.getDay();
	const daysToWeekend = dayOfWeek >= 5 ? 0 : 5 - dayOfWeek;

	return (
		<div className="flex h-full items-center justify-between px-2 select-none">
			{/* Leading: Icon & Schedule Info */}
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex size-11 flex-none items-center justify-center rounded-2xl bg-amber-500/16 text-amber-400">
					{isOffWork ? <PartyPopperIcon size={20} /> : <CoffeeIcon size={20} />}
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-1.5">
						<span className="text-[13px] font-semibold text-text">{isOffWork ? "自由时刻" : "下班倒计时"}</span>
						<span className="rounded-full bg-amber-400/15 px-1.5 py-0.2 text-[10px] font-medium text-amber-300">
							{isOffWork ? "已下班" : "摸鱼中"}
						</span>
					</div>
					<span className="mt-0.5 text-[11px] text-text-faint">
						计划：<span className="font-mono text-text">{offTimeStr}</span> 准时打卡
					</span>
				</div>
			</div>

			{/* Center: Hero Countdown + Workday Progress */}
			<div className="flex flex-col items-center justify-center px-4">
				{isOffWork ? (
					<div className="text-[20px] font-bold text-amber-300">🎉 今日工时已圆满达成！</div>
				) : (
					<>
						<div className="font-mono text-[28px]/[1.1] font-bold tracking-tight text-text tabular-nums">
							{String(remHours).padStart(2, "0")}:{String(remMinutes).padStart(2, "0")}:
							{String(remSecs).padStart(2, "0")}
						</div>
						<div className="mt-1.5 flex items-center gap-2">
							<div className="h-1.5 w-36 overflow-hidden rounded-full bg-white/10">
								<div
									className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
							<span className="font-mono text-[10px] text-text-faint tabular-nums">进度 {progressPercent}%</span>
						</div>
					</>
				)}
			</div>

			{/* Trailing: Weekend Badge & Action */}
			<div className="flex flex-none items-center gap-2">
				<div className="flex flex-col items-end gap-1">
					<span className="flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-0.5 text-[10.5px] font-medium text-amber-300/90">
						<SparklesIcon size={11} />
						<span>{daysToWeekend === 0 ? "周末狂欢中" : `距周末 ${daysToWeekend} 天`}</span>
					</span>
					<span className="text-[10px] text-text-faint">高效摸鱼 · 拒绝内卷</span>
				</div>
			</div>
		</div>
	);
}
