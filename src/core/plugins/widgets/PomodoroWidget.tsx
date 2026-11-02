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

	const handleReset = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsRunning(false);
		setTimeLeft((mode === "work" ? workMinutes : breakMinutes) * 60);
	};

	const switchMode = (newMode: "work" | "break", e: React.MouseEvent) => {
		e.stopPropagation();
		setMode(newMode);
		setIsRunning(false);
		setTimeLeft((newMode === "work" ? workMinutes : breakMinutes) * 60);
	};

	const toggleRunning = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsRunning(!isRunning);
	};

	const isWork = mode === "work";

	return (
		<div className="flex h-full items-center justify-between px-2 select-none">
			{/* Leading: Icon + Mode Info */}
			<div className="flex min-w-0 items-center gap-3">
				<div
					className={`flex size-11 flex-none items-center justify-center rounded-2xl transition-colors ${
						isWork ? "bg-red-500/16 text-red-400" : "bg-emerald-500/16 text-emerald-400"
					}`}
				>
					{isWork ? <TimerIcon size={20} /> : <CoffeeIcon size={20} />}
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-1.5">
						<span className="text-[13px] font-semibold text-text">{isWork ? "专注模式" : "休息时间"}</span>
						<span
							className={`rounded-full px-1.5 py-0.2 text-[10px] font-medium ${
								isRunning
									? isWork
										? "bg-red-500/20 text-red-400"
										: "bg-emerald-500/20 text-emerald-400"
									: "bg-white/10 text-text-faint"
							}`}
						>
							{isRunning ? "进行中" : "已暂停"}
						</span>
					</div>
					<div className="mt-0.5 flex items-center gap-1">
						<button
							type="button"
							onClick={(e) => switchMode("work", e)}
							className={`rounded px-1 text-[11px] transition-colors ${
								isWork ? "font-semibold text-red-400 underline underline-offset-2" : "text-text-faint hover:text-text"
							}`}
						>
							工作 ({workMinutes}m)
						</button>
						<span className="text-[10px] text-white/20">·</span>
						<button
							type="button"
							onClick={(e) => switchMode("break", e)}
							className={`rounded px-1 text-[11px] transition-colors ${
								!isWork
									? "font-semibold text-emerald-400 underline underline-offset-2"
									: "text-text-faint hover:text-text"
							}`}
						>
							休息 ({breakMinutes}m)
						</button>
					</div>
				</div>
			</div>

			{/* Center: Hero Timer + Progress Capsule */}
			<div className="flex flex-col items-center justify-center px-4">
				<div className="font-mono text-[30px]/[1.1] font-bold tracking-tight text-text tabular-nums">
					{formattedTime}
				</div>
				<div className="mt-1.5 flex items-center gap-2">
					<div className="h-1.5 w-36 overflow-hidden rounded-full bg-white/10">
						<div
							className={`h-full transition-all duration-300 ${isWork ? "bg-red-500" : "bg-emerald-400"}`}
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
					<span className="font-mono text-[10px] text-text-faint tabular-nums">{progressPercent}%</span>
				</div>
			</div>

			{/* Trailing: Apple Frosted Capsule Actions */}
			<div className="flex flex-none items-center gap-2">
				<button
					type="button"
					onClick={toggleRunning}
					className={`flex h-8.5 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 ${
						isRunning
							? "bg-white/15 hover:bg-white/20"
							: isWork
								? "bg-red-500 hover:bg-red-600"
								: "bg-emerald-500 hover:bg-emerald-600"
					}`}
				>
					{isRunning ? <PauseIcon size={14} className="fill-white" /> : <PlayIcon size={14} className="fill-white" />}
					<span>{isRunning ? "暂停" : "开始"}</span>
				</button>
				<button
					type="button"
					onClick={handleReset}
					title="重置计时"
					className="flex size-8.5 items-center justify-center rounded-full bg-white/8 text-text-faint transition-all hover:bg-white/15 hover:text-text active:scale-95"
				>
					<RotateCcwIcon size={13} />
				</button>
			</div>
		</div>
	);
}
