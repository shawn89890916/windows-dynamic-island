import { useEffect, useState } from "react";
import { useT } from "../../i18n";

type TimerMode = "countdown" | "clock";
interface TimerState {
	mode: TimerMode;
	durationSeconds: number;
	endAt: number | null;
	remainingSeconds: number;
	running: boolean;
	completed: boolean;
}

const STORAGE_KEY = "island_timer_state";
const emptyState: TimerState = {
	mode: "countdown",
	durationSeconds: 10 * 60,
	endAt: null,
	remainingSeconds: 10 * 60,
	running: false,
	completed: false,
};
let timerState = loadState();
const listeners = new Set<() => void>();
let soundContext: AudioContext | null = null;
const pluginSdk = (
	globalThis as typeof globalThis & {
		__ISLAND_PLUGIN_SDK__?: { setPluginActivity: (id: string, value: Record<string, unknown> | null) => void };
	}
).__ISLAND_PLUGIN_SDK__;

function loadState(): TimerState {
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as TimerState | null;
		if (!saved) return emptyState;
		if (saved.running && saved.endAt) {
			const remainingSeconds = Math.max(0, Math.ceil((saved.endAt - Date.now()) / 1000));
			return { ...saved, remainingSeconds, running: remainingSeconds > 0, completed: remainingSeconds === 0 };
		}
		return { ...emptyState, ...saved };
	} catch {
		return emptyState;
	}
}

function publish() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
	} catch {
		// The in-memory timer still works when browser storage is unavailable.
	}
	for (const listener of listeners) listener();
}

function playAlarm() {
	try {
		const context = soundContext ?? new AudioContext();
		soundContext = context;
		void context.resume();
		for (let i = 0; i < 3; i++) {
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			oscillator.frequency.value = i === 1 ? 880 : 660;
			gain.gain.setValueAtTime(0.0001, context.currentTime + i * 0.42);
			gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + i * 0.42 + 0.025);
			gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + i * 0.42 + 0.3);
			oscillator.connect(gain);
			gain.connect(context.destination);
			oscillator.start(context.currentTime + i * 0.42);
			oscillator.stop(context.currentTime + i * 0.42 + 0.32);
		}
	} catch {
		// Notifications remain available if audio is blocked by the host.
	}
	if (typeof Notification !== "undefined" && Notification.permission === "granted")
		new Notification("计时结束", { body: "灵动岛计时器已到时。" });
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function update(next: TimerState) {
	timerState = next;
	publish();
}

function useTimerState() {
	const [, refresh] = useState(0);
	useEffect(() => subscribe(() => refresh((value) => value + 1)), []);
	return timerState;
}

function formatTime(seconds: number) {
	const safe = Math.max(0, seconds);
	const hours = Math.floor(safe / 3600);
	const minutes = Math.floor((safe % 3600) / 60);
	const remainder = safe % 60;
	return hours > 0
		? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
		: `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function start() {
	if (typeof Notification !== "undefined" && Notification.permission === "default")
		void Notification.requestPermission();
	if (typeof AudioContext !== "undefined") {
		soundContext ??= new AudioContext();
		void soundContext.resume();
	}
	const remainingSeconds = timerState.completed ? timerState.durationSeconds : timerState.remainingSeconds;
	const endAt = Date.now() + remainingSeconds * 1000;
	update({ ...timerState, endAt, remainingSeconds, running: true, completed: false });
}

function pause() {
	const remainingSeconds = timerState.endAt
		? Math.max(0, Math.ceil((timerState.endAt - Date.now()) / 1000))
		: timerState.remainingSeconds;
	update({ ...timerState, endAt: null, remainingSeconds, running: false });
}

function reset(durationSeconds = timerState.durationSeconds, mode = timerState.mode) {
	update({
		...timerState,
		mode,
		durationSeconds,
		endAt: null,
		remainingSeconds: durationSeconds,
		running: false,
		completed: false,
	});
}

function setDuration(seconds: number) {
	const durationSeconds = Math.max(60, Math.min(99 * 3600 + 59 * 60, Math.round(seconds)));
	reset(durationSeconds, "countdown");
}

function setClock(hour: number, minute: number) {
	const target = new Date();
	target.setHours(hour, minute, 0, 0);
	if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
	const durationSeconds = Math.max(1, Math.ceil((target.getTime() - Date.now()) / 1000));
	reset(durationSeconds, "clock");
}

export function TimerBackground() {
	const state = useTimerState();
	useEffect(() => {
		const interval = window.setInterval(() => {
			if (!timerState.running || !timerState.endAt) return;
			const remainingSeconds = Math.max(0, Math.ceil((timerState.endAt - Date.now()) / 1000));
			if (!remainingSeconds) {
				update({ ...timerState, running: false, endAt: null, remainingSeconds: 0, completed: true });
				playAlarm();
			} else if (remainingSeconds !== timerState.remainingSeconds) {
				update({ ...timerState, remainingSeconds });
			}
		}, 250);
		return () => window.clearInterval(interval);
	}, []);
	useEffect(() => {
		pluginSdk?.setPluginActivity(
			"com.island.timer",
			state.running || state.completed
				? {
						active: true,
						priority: 86,
						left: state.completed ? "计时完成" : state.mode === "clock" ? "结束时间" : "倒计时",
						right: state.completed ? "00:00" : formatTime(state.remainingSeconds),
						accent: state.completed ? "#FBBF24" : "#A78BFA",
						activityKey: state.completed ? `timer-finished:${state.endAt ?? Date.now()}` : undefined,
					}
				: null,
		);
	}, [state]);
	return null;
}

export function TimerWidget() {
	const t = useT();
	const state = useTimerState();
	const [hours, setHours] = useState("0");
	const [minutes, setMinutes] = useState("10");
	const [clockTime, setClockTime] = useState(() => {
		const date = new Date(Date.now() + 10 * 60 * 1000);
		return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
	});
	const isRunning = state.running;

	return (
		<div className="flex h-full items-center justify-between gap-5 px-5 text-text">
			<div className="flex min-w-0 flex-col gap-3">
				<div className="flex items-center gap-2">
					<button
						type="button"
						aria-pressed={state.mode === "countdown"}
						onClick={() => reset(state.durationSeconds, "countdown")}
						className={`rounded-full px-3 py-1 text-xs ${state.mode === "countdown" ? "bg-violet-400/20 text-violet-200" : "bg-white/6 text-text-dim"}`}
					>
						{t("marketplace.widgets.timer.countdown")}
					</button>
					<button
						type="button"
						aria-pressed={state.mode === "clock"}
						onClick={() => reset(state.durationSeconds, "clock")}
						className={`rounded-full px-3 py-1 text-xs ${state.mode === "clock" ? "bg-violet-400/20 text-violet-200" : "bg-white/6 text-text-dim"}`}
					>
						{t("marketplace.widgets.timer.until")}
					</button>
				</div>
				{state.mode === "countdown" ? (
					<div className="flex items-center gap-2 text-xs text-text-dim">
						<label className="flex items-center gap-1">
							{t("marketplace.widgets.timer.hours")}
							<input
								aria-label={t("marketplace.widgets.timer.hours")}
								type="number"
								min="0"
								max="99"
								value={hours}
								disabled={isRunning}
								className="w-14 rounded-lg border border-white/10 bg-white/8 px-2 py-2 text-center text-sm text-text"
								onChange={(e) => setHours(e.target.value)}
							/>
						</label>
						<label className="flex items-center gap-1">
							{t("marketplace.widgets.timer.minutes")}
							<input
								aria-label={t("marketplace.widgets.timer.minutes")}
								type="number"
								min="0"
								max="59"
								value={minutes}
								disabled={isRunning}
								className="w-14 rounded-lg border border-white/10 bg-white/8 px-2 py-2 text-center text-sm text-text"
								onChange={(e) => setMinutes(e.target.value)}
							/>
						</label>
						<button
							type="button"
							disabled={isRunning}
							onClick={() => setDuration((Number(hours) * 60 + Number(minutes)) * 60)}
							className="rounded-lg bg-white/10 px-3 py-2 text-text hover:bg-white/15 disabled:opacity-40"
						>
							{t("marketplace.widgets.timer.set")}
						</button>
					</div>
				) : (
					<label className="flex items-center gap-2 text-xs text-text-dim">
						{t("marketplace.widgets.timer.endAt")}
						<input
							aria-label={t("marketplace.widgets.timer.endAt")}
							type="time"
							value={clockTime}
							disabled={isRunning}
							className="rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-sm text-text"
							onChange={(e) => setClockTime(e.target.value)}
						/>
						<button
							type="button"
							disabled={isRunning}
							onClick={() => {
								const [hour, minute] = clockTime.split(":").map(Number);
								setClock(hour, minute);
							}}
							className="rounded-lg bg-white/10 px-3 py-2 text-text hover:bg-white/15 disabled:opacity-40"
						>
							{t("marketplace.widgets.timer.set")}
						</button>
					</label>
				)}
				<p className="text-xs text-text-faint">
					{state.completed ? t("marketplace.widgets.timer.finished") : t("marketplace.widgets.timer.alertHint")}
				</p>
			</div>
			<div className="flex shrink-0 flex-col items-end gap-3">
				<div
					className={`font-mono text-4xl font-semibold tabular-nums ${state.completed ? "text-amber-300" : "text-text"}`}
				>
					{formatTime(state.remainingSeconds)}
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={isRunning ? pause : start}
						className="rounded-full bg-violet-400/20 px-4 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-400/30"
					>
						{isRunning
							? t("marketplace.widgets.timer.pause")
							: state.completed
								? t("marketplace.widgets.timer.restart")
								: t("marketplace.widgets.timer.start")}
					</button>
					<button
						type="button"
						onClick={() => reset()}
						className="rounded-full bg-white/8 px-4 py-2 text-xs text-text-dim hover:bg-white/14"
					>
						{t("marketplace.widgets.timer.reset")}
					</button>
				</div>
			</div>
		</div>
	);
}
