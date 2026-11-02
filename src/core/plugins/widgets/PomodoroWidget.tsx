import { CoffeeIcon, PauseIcon, PlayIcon, RotateCcwIcon, TimerIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "../../../core/i18n";

export function PomodoroWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
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
		<div className="flex h-full items-center justify-between px-3 select-none">
			{/* Leading: Icon + Mode Info + Quick Switchers */}
			<div className="flex min-w-0 items-center gap-3.5">
				<div
					className={`flex size-11.5 shrink-0 items-center justify-center rounded-2xl transition-colors ${
						isWork ? "bg-red-500/18 text-red-400" : "bg-emerald-500/18 text-emerald-400"
					}`}
				>
					{isWork ? <TimerIcon size={22} /> : <CoffeeIcon size={22} />}
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-2">
						<span className="text-sm font-semibold text-text whitespace-nowrap">
							{isWork ? t("marketplace.widgets.pomodoro.focus") : t("marketplace.widgets.pomodoro.break")}
						</span>
						<span
							className={`rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 whitespace-nowrap ${
								isRunning
									? isWork
										? "bg-red-500/20 text-red-400"
										: "bg-emerald-500/20 text-emerald-400"
									: "bg-white/10 text-text-faint"
							}`}
						>
							{isRunning ? t("marketplace.widgets.pomodoro.running") : t("marketplace.widgets.pomodoro.paused")}
						</span>
					</div>
					<div className="mt-1 flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={(e) => switchMode("work", e)}
							className={`rounded-md px-2 py-0.5 text-xs transition-colors shrink-0 whitespace-nowrap ${
								isWork
									? "bg-red-500/20 font-semibold text-red-400 ring-1 ring-red-500/30"
									: "text-text-faint hover:text-text bg-white/5"
							}`}
						>
							{t("marketplace.widgets.pomodoro.workLabel")} ({workMinutes}m)
						</button>
						<button
							type="button"
							onClick={(e) => switchMode("break", e)}
							className={`rounded-md px-2 py-0.5 text-xs transition-colors shrink-0 whitespace-nowrap ${
								!isWork
									? "bg-emerald-500/20 font-semibold text-emerald-400 ring-1 ring-emerald-500/30"
									: "text-text-faint hover:text-text bg-white/5"
							}`}
						>
							{t("marketplace.widgets.pomodoro.breakLabel")} ({breakMinutes}m)
						</button>
					</div>
				</div>
			</div>

			{/* Center: Hero Timer + Progress Capsule */}
			<div className="flex flex-col items-center justify-center px-4 shrink-0">
				<div className="font-mono text-[36px]/[1.1] font-bold tracking-tight text-text tabular-nums">
					{formattedTime}
				</div>
				<div className="mt-2 flex items-center gap-2.5">
					<div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
						<div
							className={`h-full transition-all duration-300 ${isWork ? "bg-red-500" : "bg-emerald-400"}`}
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
					<span className="font-mono text-[11px] text-text-faint tabular-nums">{progressPercent}%</span>
				</div>
			</div>

			{/* Trailing: Apple Frosted Capsule Actions */}
			<div className="flex shrink-0 items-center gap-2.5">
				<button
					type="button"
					onClick={toggleRunning}
					className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 whitespace-nowrap ${
						isRunning
							? "bg-white/15 hover:bg-white/20"
							: isWork
								? "bg-red-500 hover:bg-red-600"
								: "bg-emerald-500 hover:bg-emerald-600"
					}`}
				>
					{isRunning ? <PauseIcon size={14} className="fill-white" /> : <PlayIcon size={14} className="fill-white" />}
					<span>{isRunning ? t("marketplace.widgets.pomodoro.pause") : t("marketplace.widgets.pomodoro.start")}</span>
				</button>
				<button
					type="button"
					onClick={handleReset}
					title={t("marketplace.widgets.pomodoro.reset")}
					className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-text-faint transition-all hover:bg-white/16 hover:text-text active:scale-95"
				>
					<RotateCcwIcon size={14} />
				</button>
			</div>
		</div>
	);
}
