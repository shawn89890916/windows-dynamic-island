import { useCallback, useEffect, useState } from "react";

/**
 * Global persistent store for Plugin Live Activities (实时活动).
 * Ensures background tasks (like Pomodoro timers) continue running accurately
 * even when the island collapses or widgets unmount.
 */

export interface PomodoroStoreState {
	mode: "work" | "break";
	timeLeft: number; // in seconds
	isRunning: boolean;
	workDuration: number; // in minutes
	breakDuration: number; // in minutes
	targetEndTime: number | null; // Date.now() timestamp when current cycle ends
}

const DEFAULT_POMODORO: PomodoroStoreState = {
	mode: "work",
	timeLeft: 25 * 60,
	isRunning: false,
	workDuration: 25,
	breakDuration: 5,
	targetEndTime: null,
};

let pomodoroState: PomodoroStoreState = loadPomodoro();
const pomodoroListeners = new Set<() => void>();

function loadPomodoro(): PomodoroStoreState {
	try {
		const raw = localStorage.getItem("island_pomodoro_state");
		if (raw) {
			const saved = JSON.parse(raw) as PomodoroStoreState;
			if (saved.isRunning && saved.targetEndTime) {
				const remaining = Math.max(0, Math.round((saved.targetEndTime - Date.now()) / 1000));
				if (remaining > 0) {
					return { ...saved, timeLeft: remaining };
				}
				// Timer expired while app was closed or unmounted
				const nextMode = saved.mode === "work" ? "break" : "work";
				const duration = (nextMode === "work" ? saved.workDuration : saved.breakDuration) * 60;
				return {
					...saved,
					mode: nextMode,
					timeLeft: duration,
					isRunning: false,
					targetEndTime: null,
				};
			}
			return saved;
		}
	} catch {
		// fallback
	}
	return DEFAULT_POMODORO;
}

function savePomodoro() {
	try {
		localStorage.setItem("island_pomodoro_state", JSON.stringify(pomodoroState));
	} catch {
		// ignore
	}
	for (const cb of pomodoroListeners) cb();
}

// Background timer ticker that runs continuously
if (typeof window !== "undefined") {
	window.setInterval(() => {
		if (!pomodoroState.isRunning || !pomodoroState.targetEndTime) return;
		const remaining = Math.max(0, Math.round((pomodoroState.targetEndTime - Date.now()) / 1000));
		if (remaining <= 0) {
			// Finished cycle
			const nextMode = pomodoroState.mode === "work" ? "break" : "work";
			const nextDuration = (nextMode === "work" ? pomodoroState.workDuration : pomodoroState.breakDuration) * 60;
			pomodoroState = {
				...pomodoroState,
				mode: nextMode,
				timeLeft: nextDuration,
				isRunning: false,
				targetEndTime: null,
			};
			savePomodoro();
		} else if (remaining !== pomodoroState.timeLeft) {
			pomodoroState = {
				...pomodoroState,
				timeLeft: remaining,
			};
			savePomodoro();
		}
	}, 500);
}

export function usePomodoroLive() {
	const [state, setState] = useState<PomodoroStoreState>(pomodoroState);

	useEffect(() => {
		const update = () => setState(pomodoroState);
		pomodoroListeners.add(update);
		return () => {
			pomodoroListeners.delete(update);
		};
	}, []);

	const start = useCallback(() => {
		if (pomodoroState.isRunning) return;
		const target = Date.now() + pomodoroState.timeLeft * 1000;
		pomodoroState = {
			...pomodoroState,
			isRunning: true,
			targetEndTime: target,
		};
		savePomodoro();
	}, []);

	const pause = useCallback(() => {
		if (!pomodoroState.isRunning) return;
		pomodoroState = {
			...pomodoroState,
			isRunning: false,
			targetEndTime: null,
		};
		savePomodoro();
	}, []);

	const reset = useCallback(() => {
		const duration = (pomodoroState.mode === "work" ? pomodoroState.workDuration : pomodoroState.breakDuration) * 60;
		pomodoroState = {
			...pomodoroState,
			timeLeft: duration,
			isRunning: false,
			targetEndTime: null,
		};
		savePomodoro();
	}, []);

	const switchMode = useCallback((mode: "work" | "break") => {
		const duration = (mode === "work" ? pomodoroState.workDuration : pomodoroState.breakDuration) * 60;
		pomodoroState = {
			...pomodoroState,
			mode,
			timeLeft: duration,
			isRunning: false,
			targetEndTime: null,
		};
		savePomodoro();
	}, []);

	const setDurations = useCallback((workMins: number, breakMins: number) => {
		if (pomodoroState.workDuration === workMins && pomodoroState.breakDuration === breakMins) return;
		pomodoroState = {
			...pomodoroState,
			workDuration: workMins,
			breakDuration: breakMins,
			timeLeft: (pomodoroState.mode === "work" ? workMins : breakMins) * 60,
		};
		savePomodoro();
	}, []);

	const minutes = Math.floor(state.timeLeft / 60);
	const seconds = state.timeLeft % 60;
	const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	const totalSecs = (state.mode === "work" ? state.workDuration : state.breakDuration) * 60;
	const progressPercent = Math.round(((totalSecs - state.timeLeft) / totalSecs) * 100);

	return {
		...state,
		start,
		pause,
		reset,
		switchMode,
		setDurations,
		formattedTime,
		progressPercent,
	};
}

export function getPomodoroSnapshot(): PomodoroStoreState {
	return pomodoroState;
}
