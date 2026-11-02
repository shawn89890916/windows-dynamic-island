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
		<div className="flex h-full flex-col justify-between px-3 py-1 select-none">
			{/* Top Bar: Schedule & Status Summary */}
			<div className="flex items-center justify-between border-b border-white/8 pb-2.5">
				<div className="flex items-center gap-3">
					<div className="flex size-9.5 items-center justify-center rounded-2xl bg-amber-500/18 text-amber-400">
						{isOffWork ? <PartyPopperIcon size={20} /> : <CoffeeIcon size={20} />}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-[13px] font-semibold text-text">{isOffWork ? "自由时刻" : "下班倒计时"}</span>
							<span className="rounded-full bg-amber-400/18 px-2 py-0.2 text-[10.5px] font-medium text-amber-300">
								{isOffWork ? "已下班" : "摸鱼中"}
							</span>
						</div>
						<p className="text-[11px] text-text-faint">
							计划工作时段：{startTimeStr} ~ {offTimeStr} 准时打卡
						</p>
					</div>
				</div>

				<span className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-amber-300/90 border border-white/6">
					<SparklesIcon size={12} />
					<span>{daysToWeekend === 0 ? "周末狂欢中" : `距周末 ${daysToWeekend} 天`}</span>
				</span>
			</div>

			{/* Center & Sub-metrics Row (Desktop Enhanced) */}
			<div className="flex items-center justify-between pt-2">
				<div className="flex flex-col">
					<span className="text-[11px] text-text-faint">距离今日下班还有</span>
					<div className="font-mono text-[30px]/[1.1] font-bold tracking-tight text-text tabular-nums">
						{isOffWork ? (
							<span className="text-[22px] text-amber-300">🎉 今日工时已达成</span>
						) : (
							`${String(remHours).padStart(2, "0")}:${String(remMinutes).padStart(2, "0")}:${String(remSecs).padStart(2, "0")}`
						)}
					</div>
				</div>

				{/* 3 Metric Pills Side by Side */}
				<div className="flex items-center gap-2">
					<div className="flex flex-col items-center rounded-xl bg-white/4 border border-white/5 px-3 py-1.5">
						<span className="text-[10px] text-text-faint">今日进度</span>
						<span className="font-mono text-xs font-bold text-amber-300 tabular-nums">{progressPercent}%</span>
					</div>
					<div className="flex flex-col items-center rounded-xl bg-white/4 border border-white/5 px-3 py-1.5">
						<span className="text-[10px] text-text-faint">已工作</span>
						<span className="font-mono text-xs font-bold text-text tabular-nums">
							{Math.floor(elapsedSpan / 3600000)}h {Math.floor((elapsedSpan % 3600000) / 60000)}m
						</span>
					</div>
					<div className="flex flex-col items-center rounded-xl bg-white/4 border border-white/5 px-3 py-1.5">
						<span className="text-[10px] text-text-faint">状态</span>
						<span className="text-xs font-semibold text-emerald-400">稳定摸鱼</span>
					</div>
				</div>
			</div>
		</div>
	);
}
