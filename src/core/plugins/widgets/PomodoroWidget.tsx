import { CoffeeIcon, PauseIcon, PlayIcon, RotateCcwIcon, TimerIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function PomodoroWidget({ settings }: { settings: Record<string, unknown> }) {
	const workMinutes = Number(settings.workDuration ?? 25);
	const breakMinutes = Number(settings.breakDuration ?? 5);

	const [mode, setMode] = useState<"work" | "break">("work");
	const [timeLeft, setTimeLeft] = useState(workMinutes * 60);
	const [isRunning, setIsRunning] = useState(false);

	useEffect(() => {
		let timer: number | undefined;
		if (isRunning) {
			timer = window.setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						// switch mode
						const nextMode = mode === "work" ? "break" : "work";
						setMode(nextMode);
						return (nextMode === "work" ? workMinutes : breakMinutes) * 60;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => clearInterval(timer);
	}, [isRunning, mode, workMinutes, breakMinutes]);

	const minutes = Math.floor(timeLeft / 60);
	const seconds = timeLeft % 60;
	const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

	const totalSeconds = (mode === "work" ? workMinutes : breakMinutes) * 60;
	const progressPercent = Math.round(((totalSeconds - timeLeft) / totalSeconds) * 100);

	const handleReset = () => {
		setIsRunning(false);
		setTimeLeft((mode === "work" ? workMinutes : breakMinutes) * 60);
	};

	const switchMode = (newMode: "work" | "break") => {
		setMode(newMode);
		setIsRunning(false);
		setTimeLeft((newMode === "work" ? workMinutes : breakMinutes) * 60);
	};

	return (
		<div className="flex h-full flex-col justify-between p-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-white/8 pb-3">
				<div className="flex items-center gap-2">
					<div
						className={`flex h-7 w-7 items-center justify-center rounded-lg ${
							mode === "work" ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
						}`}
					>
						{mode === "work" ? <TimerIcon size={16} /> : <CoffeeIcon size={16} />}
					</div>
					<div>
						<h3 className="text-sm font-semibold text-text">{mode === "work" ? "专注模式" : "休息时间"}</h3>
						<p className="text-[11px] text-text-faint">
							{mode === "work" ? `保持专注 ${workMinutes} 分钟` : `深呼吸，放松休息 ${breakMinutes} 分钟`}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1 rounded-lg bg-white/6 p-0.5 text-xs">
					<button
						type="button"
						onClick={() => switchMode("work")}
						className={`rounded-md px-2 py-1 transition-colors ${
							mode === "work" ? "bg-white/15 text-white" : "text-text-faint hover:text-text"
						}`}
					>
						专注
					</button>
					<button
						type="button"
						onClick={() => switchMode("break")}
						className={`rounded-md px-2 py-1 transition-colors ${
							mode === "break" ? "bg-white/15 text-white" : "text-text-faint hover:text-text"
						}`}
					>
						休息
					</button>
				</div>
			</div>

			{/* Center timer display */}
			<div className="flex flex-col items-center justify-center py-2">
				<div className="font-mono text-4xl font-bold tracking-wider text-text">{formattedTime}</div>

				{/* Progress bar */}
				<div className="mt-3 h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
					<div
						className={`h-full transition-all duration-300 ${mode === "work" ? "bg-red-500" : "bg-emerald-400"}`}
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
				<span className="mt-1.5 text-[10px] text-text-faint">已完成 {progressPercent}%</span>
			</div>

			{/* Bottom Action controls */}
			<div className="flex items-center justify-center gap-3 border-t border-white/6 pt-3">
				<button
					type="button"
					onClick={() => setIsRunning(!isRunning)}
					className={`flex h-8 items-center gap-1.5 rounded-full px-5 text-xs font-semibold transition-all active:scale-95 ${
						isRunning
							? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
							: "bg-white/20 text-white hover:bg-white/30"
					}`}
				>
					{isRunning ? (
						<>
							<PauseIcon size={13} />
							<span>暂停</span>
						</>
					) : (
						<>
							<PlayIcon size={13} fill="currentColor" />
							<span>开始专注</span>
						</>
					)}
				</button>
				<button
					type="button"
					onClick={handleReset}
					title="重置计时"
					className="flex h-8 w-8 items-center justify-center rounded-full bg-white/6 text-text-faint hover:bg-white/12 hover:text-text"
				>
					<RotateCcwIcon size={13} />
				</button>
			</div>
		</div>
	);
}
