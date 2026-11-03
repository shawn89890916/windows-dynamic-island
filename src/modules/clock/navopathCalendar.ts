import type { NavoPathTask } from "../../core/plugins/navopathMcp";

/** Local calendar dates must not shift when converted to UTC. */
export function localDateKey(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function activeRecords(task: NavoPathTask) {
	return (task.timelineRecords ?? []).filter((record) => record.executionStatus === "scheduled");
}

export function tasksOnNavoPathDate(tasks: NavoPathTask[], date: string, includeUndated = false) {
	return tasks.filter((task) => {
		if (task.completed) return false;
		const records = activeRecords(task);
		const planned = records.length ? undefined : task.plannedForDate;
		return (
			records.some(
				(record) => date >= record.scheduledDate && date <= (record.scheduledEndDate || record.scheduledDate),
			) ||
			task.dueDate === date ||
			planned === date ||
			(includeUndated && !records.length && !planned && !task.dueDate)
		);
	});
}

export function taskStartOnDate(task: NavoPathTask, date: string) {
	const record = activeRecords(task).find(
		(item) => date >= item.scheduledDate && date <= (item.scheduledEndDate || item.scheduledDate),
	);
	return record ? (record.scheduledDate === date ? record.scheduledStart : "00:00") : undefined;
}
