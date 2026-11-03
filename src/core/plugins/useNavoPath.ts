import { useCallback, useEffect, useRef, useState } from "react";
import {
	completeNavoPathTask,
	createNavoPathTask,
	fetchNavoPathSummary,
	fetchNavoPathTasks,
	type NavoPathSummary,
	type NavoPathTask,
} from "./navopathMcp";

export function useNavoPath(endpoint: string, token: string, enabled = true, limit = 10) {
	const [summary, setSummary] = useState<NavoPathSummary | null>(null);
	const [tasks, setTasks] = useState<NavoPathTask[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [adding, setAdding] = useState(false);
	const [completingId, setCompletingId] = useState<string | null>(null);
	const generation = useRef(0);
	const busy = useRef(false);
	const configured = enabled && Boolean(token.trim());
	const loadData = useCallback(async () => {
		if (!enabled || !token.trim() || busy.current) return;
		const request = ++generation.current;
		setLoading(true);
		try {
			const [nextSummary, nextTasks] = await Promise.all([
				fetchNavoPathSummary(endpoint, token),
				fetchNavoPathTasks(endpoint, token, limit),
			]);
			if (request !== generation.current) return;
			setSummary(nextSummary);
			setTasks(nextTasks);
			setError(null);
		} catch (cause) {
			if (request === generation.current) setError(String(cause));
		} finally {
			if (request === generation.current) setLoading(false);
		}
	}, [endpoint, token, enabled, limit]);
	useEffect(() => {
		// Account changes must never reuse an unscoped local-storage cache.
		setSummary(null);
		setTasks([]);
		setError(null);
		setLoading(false);
		setAdding(false);
		setCompletingId(null);
		busy.current = false;
		void loadData();
		const interval = setInterval(() => void loadData(), 60000);
		window.addEventListener("online", loadData);
		return () => {
			generation.current++;
			clearInterval(interval);
			window.removeEventListener("online", loadData);
		};
	}, [loadData]);
	const mutate = async (action: () => Promise<unknown>, taskId?: string) => {
		if (!configured || busy.current) return false;
		busy.current = true;
		const request = ++generation.current;
		setLoading(false);
		if (taskId) setCompletingId(taskId);
		else setAdding(true);
		let succeeded = false;
		try {
			const result = await action();
			if (request !== generation.current) return false;
			if (taskId) {
				setTasks((previous) => previous.filter((task) => task.id !== taskId));
				setSummary((previous) =>
					previous
						? {
								...previous,
								openTasks: Math.max(0, previous.openTasks - 1),
								completedTasks: previous.completedTasks + 1,
							}
						: previous,
				);
			} else {
				setTasks((previous) => [result as NavoPathTask, ...previous].slice(0, limit));
				setSummary((previous) => (previous ? { ...previous, openTasks: previous.openTasks + 1 } : previous));
			}
			setError(null);
			succeeded = true;
		} catch (cause) {
			if (request === generation.current) setError(String(cause));
		} finally {
			if (request === generation.current) {
				busy.current = false;
				setAdding(false);
				setCompletingId(null);
			}
		}
		if (succeeded) void loadData();
		return succeeded;
	};
	return {
		summary,
		tasks,
		loading,
		error,
		adding,
		completingId,
		loadData,
		addTask: (title: string) => mutate(() => createNavoPathTask(endpoint, token, title)),
		completeTask: (id: string) => mutate(() => completeNavoPathTask(endpoint, token, id), id),
	};
}
