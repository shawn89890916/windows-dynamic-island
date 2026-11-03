import { expect, test } from "bun:test";
import type { NavoPathTask } from "../../core/plugins/navopathMcp";
import { localDateKey, taskStartOnDate, tasksOnNavoPathDate } from "./navopathCalendar";

const tasks: NavoPathTask[] = [
	{ id: "planned", title: "Planned", plannedForDate: "2026-11-03" },
	{ id: "deadline", title: "Deadline", dueDate: "2026-11-04" },
	{ id: "undated", title: "Undated" },
	{ id: "done", title: "Done", dueDate: "2026-11-03", completed: true },
	{
		id: "scheduled",
		title: "Scheduled",
		timelineRecords: [
			{ scheduledDate: "2026-11-03", scheduledStart: "14:00", executionStatus: "scheduled" },
			{ scheduledDate: "2026-11-02", scheduledStart: "10:00", executionStatus: "returned_unfinished" },
			{ scheduledDate: "2026-11-01", scheduledStart: "10:00", executionStatus: "cancelled" },
		],
	},
	{
		id: "rescheduled",
		title: "Rescheduled",
		plannedForDate: "2026-11-01",
		timelineRecords: [{ scheduledDate: "2026-11-04", scheduledStart: "09:00", executionStatus: "scheduled" }],
	},
	{
		id: "overnight",
		title: "Overnight",
		timelineRecords: [
			{
				scheduledDate: "2026-11-04",
				scheduledEndDate: "2026-11-05",
				scheduledStart: "23:00",
				executionStatus: "scheduled",
			},
		],
	},
];

test("uses local dates without UTC shifts", () => {
	expect(localDateKey(new Date(2026, 10, 3, 0, 15))).toBe("2026-11-03");
});
test("date selection shows only incomplete tasks on that date", () => {
	expect(tasksOnNavoPathDate(tasks, "2026-11-03").map((task) => task.id)).toEqual(["planned", "scheduled"]);
	expect(tasksOnNavoPathDate(tasks, "2026-11-04").map((task) => task.id)).toEqual([
		"deadline",
		"rescheduled",
		"overnight",
	]);
});
test("undated tasks appear in today's list without creating arbitrary date dots", () => {
	expect(tasksOnNavoPathDate(tasks, "2026-11-03", true).map((task) => task.id)).toEqual([
		"planned",
		"undated",
		"scheduled",
	]);
	expect(tasksOnNavoPathDate(tasks, "2026-11-09")).toEqual([]);
});
test("cancelled, returned, and superseded dates do not leave stale calendar marks", () => {
	expect(tasksOnNavoPathDate(tasks, "2026-11-01")).toEqual([]);
	expect(tasksOnNavoPathDate(tasks, "2026-11-02")).toEqual([]);
});
test("overnight schedules mark both dates and show the appropriate start", () => {
	expect(tasksOnNavoPathDate(tasks, "2026-11-05").map((task) => task.id)).toEqual(["overnight"]);
	expect(taskStartOnDate(tasks[6], "2026-11-04")).toBe("23:00");
	expect(taskStartOnDate(tasks[6], "2026-11-05")).toBe("00:00");
});
test("calendar reads all open tasks beyond the plugin's ten-row preview", () => {
	const many = Array.from({ length: 20 }, (_, i) => ({
		id: String(i),
		title: "Task",
		plannedForDate: i === 19 ? "2026-11-06" : "2026-11-03",
	}));
	expect(tasksOnNavoPathDate(many, "2026-11-06").map((task) => task.id)).toEqual(["19"]);
});
