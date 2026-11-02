import { CoffeeIcon, FlameIcon, SparklesIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function WorkCountdownWidget({ settings }: { settings: Record<string, unknown> }) {
	const offTimeStr = String(settings.offWorkTime ?? "18:00");
	const startTimeStr = String(settings.workStartTime ?? "09:00");

	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);

	// Calculate remaining seconds to off-work
	const [offHour, offMin] = offTimeStr.split(":").map(Number);
	const [startHour, startMin] = startTimeStr.split(":").map(Number);

	const targetToday = new Date(now);
	targetToday.setHours(offHour, offMin, 0, 0);

	const startToday = new Date(now);
	startToday.setHours(startHour, startMin, 0, 0);

	const diffMs = targetToday.getTime() - now.getTime();
	const isOffWork = diffMs <= 0;

	// Total working span
	const totalWorkSpan = targetToday.getTime() - startToday.getTime();
	const elapsedSpan = Math.max(0, now.getTime() - startToday.getTime());
	const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedSpan / (totalWorkSpan || 1)) * 100)));

	// Remaining breakdown
	const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
	const remHours = Math.floor(remainingSeconds / 3600);
	const remMinutes = Math.floor((remainingSeconds % 3600) / 60);
	const remSecs = remainingSeconds % 60;

	// Weekend countdown
	const dayOfWeek = now.getDay(); // 0 is Sunday, 5 is Friday
	const daysToWeekend = dayOfWeek >= 5 ? 0 : 5 - dayOfWeek;

	return (
		<div className="flex h-full flex-col justify-between p-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-white/8 pb-3">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
						<CoffeeIcon size={16} />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-text">下班倒计时</h3>
						<p className="text-[11px] text-text-faint">
							计划下班时间：<span className="font-mono text-text">{offTimeStr}</span>
						</p>
					</div>
				</div>

				<span className="flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-amber-300">
					<SparklesIcon size={11} />
					<span>摸鱼打工助手</span>
				</span>
			</div>

			{/* Center timer / status */}
			<div className="my-auto flex flex-col items-center justify-center py-1 text-center">
				{isOffWork ? (
					<div className="flex flex-col items-center gap-1.5 py-2">
						<div className="text-2xl font-bold text-emerald-400">🎉 已经下班啦！</div>
						<p className="text-xs text-text-faint">快关闭电脑，开启美好的个人生活吧！</p>
					</div>
				) : (
					<>
						<div className="font-mono text-3xl font-bold tracking-tight text-text">
							{String(remHours).padStart(2, "0")}h {String(remMinutes).padStart(2, "0")}m{" "}
							<span className="text-amber-400">{String(remSecs).padStart(2, "0")}s</span>
						</div>
						<p className="mt-1 text-xs text-text-faint">
							{progressPercent > 80
								? "🏃 胜利在向你招手，收拾桌面准备下班！"
								: progressPercent > 50
									? "☕ 下午茶时间已过，稳扎稳打向前冲！"
									: "🌱 今天也是元气满满的一天，加油！"}
						</p>
					</>
				)}

				{/* Progress bar */}
				<div className="mt-3.5 h-2 w-72 overflow-hidden rounded-full bg-white/10">
					<div
						className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
				<div className="mt-1.5 flex w-72 justify-between text-[10px] text-text-faint">
					<span>上班 {startTimeStr}</span>
					<span className="font-medium text-text">今日工时已完成 {progressPercent}%</span>
					<span>下班 {offTimeStr}</span>
				</div>
			</div>

			{/* Footer: Weekend notice */}
			<div className="flex items-center justify-between border-t border-white/6 pt-2.5 text-[11px] text-text-faint">
				<span className="flex items-center gap-1">
					<SunIcon size={12} className="text-amber-400" />
					<span>{daysToWeekend === 0 ? "今天就是周五/周末！" : `距离美好周末还剩 ${daysToWeekend} 天`}</span>
				</span>
				<span className="flex items-center gap-1">
					<FlameIcon size={12} className="text-red-400" />
					<span>坚持就是胜利</span>
				</span>
			</div>
		</div>
	);
}
