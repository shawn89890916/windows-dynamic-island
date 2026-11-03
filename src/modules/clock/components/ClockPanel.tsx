import { CheckCircle2Icon, CircleIcon, ExternalLinkIcon, PlusIcon, StarIcon } from "lucide-react";
import { useEffect, useMemo, useState, type WheelEvent } from "react";
import navopathLogo from "../../../assets/navopath.png";
import { command } from "../../../core/bridge";
import { cn } from "../../../core/cn";
import { useLocale, useT } from "../../../core/i18n";
import { useIsland } from "../../../core/island";
import {
	completeNavoPathTask,
	createNavoPathTask,
	fetchNavoPathSummary,
	fetchNavoPathTasks,
	type NavoPathSummary,
	type NavoPathTask,
} from "../../../core/plugins/navopathMcp";
import { useSetting } from "../../../core/settings";
import { useNow } from "../../ai-agents/common/format";
import { DAY_MS, dayDots, eventsOn, sameDay, startOfDay } from "../events";
import { navopathSettings } from "../settings";
import type { CalEvent, CalendarState } from "../types";

/** The wheel over the calendar flips months at most this often. */
const WHEEL_STEP_MS = 220;
/** Event rows under the date; more become "+N". */
const MAX_ROWS = 3;
/** "Join" shows from this long before a call. */
const JOIN_LEAD_MS = 15 * 60_000;

/** First day of the week for a locale (1 = Monday … 7 = Sunday). */
function firstDayOfWeek(locale: string): number {
	try {
		const l = new Intl.Locale(locale) as Intl.Locale & {
			getWeekInfo?: () => { firstDay: number };
			weekInfo?: { firstDay: number };
		};
		return (l.getWeekInfo?.() ?? l.weekInfo)?.firstDay ?? 1;
	} catch {
		return 1;
	}
}

/** ISO week number (Monday weeks; week 1 holds the first Thursday). */
function isoWeek(d: Date): number {
	const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
	const week1 = new Date(t.getFullYear(), 0, 4);
	return 1 + Math.round(((t.getTime() - week1.getTime()) / DAY_MS - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

/** Six rows of seven days covering `month`, starting on the locale's first weekday. */
function monthGrid(month: Date, firstDay: number): Date[] {
	const first = new Date(month.getFullYear(), month.getMonth(), 1);
	const offset = (first.getDay() - (firstDay % 7) + 7) % 7;
	return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i));
}

const openLink = (url: string | null) => {
	if (url?.startsWith("https://")) command("open_external", { url });
};

/** Clock, the focused day's events, and the month with a dot per calendar on busy days. */
export function ClockPanel({ calendar, highlight }: { calendar?: CalendarState; highlight?: string }) {
	const t = useT();
	const locale = useLocale();
	const island = useIsland();
	const now = useNow(1000);
	const today = new Date(now);
	const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
	const [selected, setSelected] = useState<Date | null>(null);

	// NavoPath state
	const navopathEnabled = useSetting(navopathSettings.enabled);
	const endpoint = useSetting(navopathSettings.endpoint);
	const token = useSetting(navopathSettings.token);
	const [summary, setSummary] = useState<NavoPathSummary | null>(() => {
		try {
			const s = localStorage.getItem("island_navopath_summary");
			return s ? JSON.parse(s) : { projects: 10, openTasks: 18, completedTasks: 327 };
		} catch {
			return { projects: 10, openTasks: 18, completedTasks: 327 };
		}
	});
	const [tasks, setTasks] = useState<NavoPathTask[]>(() => {
		try {
			const s = localStorage.getItem("island_navopath_tasks");
			return s ? JSON.parse(s) : [];
		} catch {
			return [];
		}
	});
	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [completingId, setCompletingId] = useState<string | null>(null);

	const events = calendar?.events;
	const calendars = calendar?.calendars;
	const dots = useMemo(() => dayDots(events ?? [], calendars ?? []), [events, calendars]);
	const colors = useMemo(() => new Map((calendars ?? []).map((c) => [c.key, c.color])), [calendars]);
	const hasSources = !!calendars?.length;

	const [activeTab, setActiveTab] = useState<"calendar" | "navopath">(() => (hasSources ? "calendar" : "navopath"));

	// Fetch NavoPath data
	useEffect(() => {
		if (!navopathEnabled || !token) return;
		let active = true;
		Promise.all([
			fetchNavoPathSummary(endpoint, token).catch(() => null),
			fetchNavoPathTasks(endpoint, token, 10).catch(() => []),
		]).then(([sum, taskList]) => {
			if (!active) return;
			if (sum) {
				setSummary(sum);
				localStorage.setItem("island_navopath_summary", JSON.stringify(sum));
			}
			if (taskList && Array.isArray(taskList) && taskList.length > 0) {
				setTasks(taskList);
				localStorage.setItem("island_navopath_tasks", JSON.stringify(taskList));
			}
		});
		return () => {
			active = false;
		};
	}, [navopathEnabled, endpoint, token]);

	useEffect(() => {
		return () => {
			island.keepOpen(false, "calendar-navopath");
		};
	}, [island]);

	const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setCompletingId(taskId);
		setTasks((prev) => prev.filter((item) => item.id !== taskId));
		if (summary) {
			setSummary({
				...summary,
				openTasks: Math.max(0, summary.openTasks - 1),
				completedTasks: summary.completedTasks + 1,
			});
		}
		try {
			await completeNavoPathTask(endpoint, token, taskId);
		} catch {
			// keep optimistic
		} finally {
			setCompletingId(null);
		}
	};

	const handleCreateTask = async (e: React.FormEvent) => {
		e.preventDefault();
		const title = newTaskTitle.trim();
		if (!title) return;
		setNewTaskTitle("");
		const tempTask: NavoPathTask = {
			id: `temp-${Date.now()}`,
			title,
			priority: "normal",
			workflowStatus: "open",
		};
		setTasks((prev) => [tempTask, ...prev]);
		if (summary) {
			setSummary({ ...summary, openTasks: summary.openTasks + 1 });
		}
		try {
			const created = await createNavoPathTask(endpoint, token, title);
			if (created?.id) {
				setTasks((prev) => prev.map((t) => (t.id === tempTask.id ? created : t)));
			}
		} catch {
			// keep optimistic temp
		}
	};

	const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(now);
	const seconds = String(today.getSeconds()).padStart(2, "0");
	const firstDay = firstDayOfWeek(locale);
	const days = monthGrid(month, firstDay);
	// Trim a trailing week that belongs entirely to the next month.
	const rows = days.slice(35).every((d) => d.getMonth() !== month.getMonth()) ? 5 : 6;
	const weekdays = days.slice(0, 7).map((d) => new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(d));
	const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
	const onCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

	// Left side: today, or the picked day and how far away it is.
	const focus = selected ?? today;
	const longDate = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(focus);
	const distance = Math.round((startOfDay(focus).getTime() - startOfDay(today).getTime()) / DAY_MS);
	const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(distance, "day");
	// Today lists what's left of it; other days list everything.
	const dayEvents = eventsOn(events ?? [], focus).filter((e) => !sameDay(focus, today) || e.allDay || e.end > now);
	const shown = dayEvents.slice(0, dayEvents.length > MAX_ROWS ? MAX_ROWS - 1 : MAX_ROWS);
	const hourFormat = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });

	const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
	const goToday = () => {
		setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
		setSelected(null);
	};

	const [lastWheel, setLastWheel] = useState(0);
	const onWheel = (e: WheelEvent) => {
		if (Math.abs(e.deltaY) < 4 || e.timeStamp - lastWheel < WHEEL_STEP_MS) return;
		setLastWheel(e.timeStamp);
		shift(Math.sign(e.deltaY));
	};

	const row = (e: CalEvent) => {
		const live = e.start <= now && now < e.end;
		const joinable = !!e.meetingUrl && !e.allDay && e.start - JOIN_LEAD_MS <= now && now < e.end;
		return (
			<li
				key={e.id}
				className={cn(
					"flex h-6 cursor-default items-center gap-2 rounded-[7px] bg-white/4 pr-1 pl-2 text-[12px] shadow-[inset_2.5px_0_0_var(--cal-color)] hover:bg-white/8",
					e.id === highlight &&
						"bg-[color-mix(in_srgb,var(--cal-color)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--cal-color)_18%,transparent)]",
				)}
				style={{ "--cal-color": colors.get(e.calendar) ?? "#8E8E93" } as React.CSSProperties}
				title={[e.title, e.location].filter(Boolean).join("\n")}
				onClick={() => openLink(e.url)}
			>
				<span
					className={cn(
						"min-w-9.5 flex-none text-[11px] font-[650] text-text-faint tabular-nums",
						live && "text-(--cal-color)",
					)}
				>
					{e.allDay ? t("calendar.allDay") : e.start < startOfDay(focus).getTime() ? "…" : hourFormat.format(e.start)}
				</span>
				<span className="min-w-0 flex-1 truncate font-[550] text-text-dim">{e.title || t("calendar.untitled")}</span>
				{joinable && (
					<button
						type="button"
						className="h-4.5 flex-none rounded-[9px] bg-(--cal-color) px-2 text-[10.5px] font-bold text-white"
						onClick={(ev) => {
							ev.stopPropagation();
							openLink(e.meetingUrl);
						}}
					>
						{t("calendar.join")}
					</button>
				)}
			</li>
		);
	};

	const focusTask = tasks.find((item) => item.priority === "urgent" || item.priority === "high") || tasks[0];
	const normalTasks = tasks.filter((item) => item.id !== focusTask?.id).slice(0, 2);

	return (
		<div className="flex h-full items-stretch justify-between gap-5 px-1" onClick={(e) => e.stopPropagation()}>
			{/* Left Column: Clock Header, Segment Tabs & Task/Event Stream */}
			<div className="flex flex-1 min-w-0 flex-col justify-between py-1">
				{/* Top Bar: Time, Date & NavoPath Switcher */}
				<div className="flex items-start justify-between gap-2">
					<div>
						<div className="flex items-baseline gap-1.5">
							<span className="font-[Segoe_UI_Variable_Display,Segoe_UI,sans-serif] text-[32px]/none font-[700] tracking-[-0.02em] tabular-nums">
								{time}
							</span>
							<span className="text-[14px] font-semibold text-text-faint">{seconds}</span>
						</div>
						<div className="flex items-center gap-2 mt-0.5">
							<span className="text-[12px] font-semibold text-text-dim first-letter:uppercase">{longDate}</span>
							<span className="text-[11px] text-text-faint">
								{selected && !sameDay(selected, today) ? relative : t("clock.week", { n: isoWeek(focus) })}
							</span>
						</div>
					</div>

					{/* View Switcher or NavoPath Quick Open */}
					{hasSources && navopathEnabled ? (
						<div className="flex items-center gap-1 rounded-full bg-white/6 p-0.5" role="tablist">
							<button
								type="button"
								role="tab"
								aria-selected={activeTab === "calendar"}
								className={cn(
									"rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
									activeTab === "calendar" ? "bg-white/12 text-text" : "text-text-faint hover:text-text-dim",
								)}
								onClick={() => setActiveTab("calendar")}
							>
								{t("calendar.navopath.tabEvents")}
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={activeTab === "navopath"}
								className={cn(
									"flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
									activeTab === "navopath" ? "bg-white/12 text-text" : "text-text-faint hover:text-text-dim",
								)}
								onClick={() => setActiveTab("navopath")}
							>
								<span>NavoPath</span>
								{tasks.length > 0 && (
									<span className="rounded-full bg-amber-500/20 px-1 text-[9.5px] text-amber-300 font-bold">
										{tasks.length}
									</span>
								)}
							</button>
						</div>
					) : navopathEnabled ? (
						<div className="flex items-center gap-1.5">
							<div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-300 border border-amber-500/20">
								<img src={navopathLogo} alt="NavoPath" className="size-3.5 object-contain" />
								<span>{summary ? `${summary.openTasks} 待办` : "NavoPath"}</span>
							</div>
							<button
								type="button"
								className="rounded-full bg-white/6 p-1 text-text-faint hover:bg-white/12 hover:text-text"
								onClick={() => command("open_external", { url: "https://navopath-planner.vercel.app" })}
								title={t("calendar.navopath.openApp")}
							>
								<ExternalLinkIcon size={11} />
							</button>
						</div>
					) : null}
				</div>

				{/* Center Content: NavoPath Tasks OR Calendar Events */}
				{activeTab === "navopath" && navopathEnabled ? (
					<div className="flex flex-col gap-1.5 my-1">
						{/* Focus Item Hero Banner */}
						{focusTask ? (
							<div
								className="flex items-center justify-between gap-2 rounded-[9px] bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 cursor-pointer hover:bg-amber-500/15 transition-colors"
								onClick={(e) => handleCompleteTask(focusTask.id, e)}
							>
								<div className="flex min-w-0 items-center gap-2">
									<StarIcon size={13} className="text-amber-400 fill-amber-400 flex-none" />
									<span className="truncate text-[12px] font-semibold text-text">{focusTask.title}</span>
								</div>
								<div className="flex items-center gap-1.5 flex-none">
									<span className="rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[9.5px] font-bold text-amber-300">
										Focus
									</span>
									<button
										type="button"
										className="rounded-full text-text-faint hover:text-amber-300 transition-colors"
										title={t("calendar.navopath.completed")}
									>
										{completingId === focusTask.id ? (
											<CheckCircle2Icon size={14} className="text-amber-300 animate-spin" />
										) : (
											<CircleIcon size={14} />
										)}
									</button>
								</div>
							</div>
						) : (
							<div className="text-[11.5px] text-text-faint py-1">{t("calendar.navopath.noTasks")}</div>
						)}

						{/* Secondary Tasks */}
						{normalTasks.map((task) => (
							<div
								key={task.id}
								className="flex items-center justify-between gap-2 rounded-[7px] bg-white/4 px-2 py-1 text-[11.5px] hover:bg-white/8 transition-colors cursor-pointer"
								onClick={(e) => handleCompleteTask(task.id, e)}
							>
								<span className="truncate text-text-dim">{task.title}</span>
								<button
									type="button"
									className="text-text-faint hover:text-text transition-colors flex-none"
									title={t("calendar.navopath.completed")}
								>
									{completingId === task.id ? (
										<CheckCircle2Icon size={13} className="text-emerald-400 animate-spin" />
									) : (
										<CircleIcon size={13} />
									)}
								</button>
							</div>
						))}

						{/* Inline Quick-Add Task Input */}
						<form
							data-no-drag
							onSubmit={handleCreateTask}
							className="mt-0.5 flex items-center gap-1.5 rounded-[8px] bg-white/5 border border-white/8 px-2 py-1 focus-within:border-white/20 transition-colors"
							onClick={(e) => e.stopPropagation()}
						>
							<PlusIcon size={12} className="text-text-faint flex-none" />
							<input
								type="text"
								value={newTaskTitle}
								onChange={(e) => setNewTaskTitle(e.target.value)}
								onMouseDown={() => {
									island.keepOpen(true, "calendar-navopath");
									command("focus_island");
								}}
								onFocus={() => {
									island.keepOpen(true, "calendar-navopath");
									command("focus_island");
								}}
								onBlur={() => {
									island.keepOpen(false, "calendar-navopath");
									command("restore_focus");
								}}
								onKeyDown={(e) => {
									if (e.key === "Escape") {
										e.currentTarget.blur();
										command("restore_focus");
									}
								}}
								placeholder={t("calendar.navopath.addPlaceholder")}
								className="w-full bg-transparent text-[11px] text-text placeholder:text-text-faint focus:outline-none"
							/>
						</form>
					</div>
				) : (
					/* Standard Calendar Events Stream */
					<div className="my-1">
						{hasSources ? (
							<ul className="flex min-w-0 list-none flex-col gap-0.5">
								{shown.map(row)}
								{dayEvents.length > shown.length && (
									<li className="pl-2 text-[11px] text-text-faint">
										{t("calendar.more", { n: dayEvents.length - shown.length })}
									</li>
								)}
								{dayEvents.length === 0 && <li className="pl-2 text-[11px] text-text-faint">{t("calendar.free")}</li>}
							</ul>
						) : (
							<div className="text-[12px] text-text-faint py-3">{t("calendar.free")}</div>
						)}
					</div>
				)}
			</div>

			{/* Right Column: Month Calendar with Activity Dots */}
			<div className="flex w-63 flex-none flex-col justify-center gap-1" data-scroll onWheel={onWheel}>
				<div className="flex h-5.5 items-center gap-1">
					<span className="flex-1 text-[13px] font-[650] first-letter:uppercase">{monthLabel}</span>
					{(!onCurrentMonth || selected) && (
						<button
							type="button"
							className="h-5 rounded-[10px] bg-[rgba(255,69,58,0.14)] px-2 text-[11px] font-[650] text-[#ff453a]"
							onClick={goToday}
						>
							{t("clock.today")}
						</button>
					)}
					<button
						type="button"
						className="size-5.5 rounded-full text-[17px] leading-none text-text-dim hover:bg-white/8"
						title={t("clock.prev")}
						onClick={() => shift(-1)}
					>
						‹
					</button>
					<button
						type="button"
						className="size-5.5 rounded-full text-[17px] leading-none text-text-dim hover:bg-white/8"
						title={t("clock.next")}
						onClick={() => shift(1)}
					>
						›
					</button>
				</div>
				<div className="grid grid-cols-7 gap-x-0.5 gap-y-px">
					{weekdays.map((w, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: weekday labels can repeat (narrow format), and the order is fixed
						<span key={`w${i}`} className="h-3.5 text-center text-[10px] font-[650] text-text-faint uppercase">
							{w}
						</span>
					))}
					{days.slice(0, rows * 7).map((d) => {
						const isToday = sameDay(d, today);
						const classes = cn(
							"relative h-5.25 rounded-[7px] text-[11.5px] font-[550] text-text-dim tabular-nums hover:bg-white/8",
							(d.getDay() === 0 || d.getDay() === 6) && "text-text-faint",
							d.getMonth() !== month.getMonth() && "opacity-35",
							selected && sameDay(d, selected) && "text-text shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.5)]",
							isToday && "bg-[#ff453a] font-[750] text-white hover:bg-[#ff453a]",
						);
						const rawMarks = dots.get(d.toDateString()) ?? [];
						const marks =
							isToday && navopathEnabled && tasks.length > 0 && !rawMarks.includes("#E5A93C")
								? [...rawMarks, "#E5A93C"]
								: rawMarks;

						return (
							<button
								type="button"
								key={d.toDateString()}
								className={classes}
								onClick={() => {
									setSelected(isToday ? null : d);
									if (d.getMonth() !== month.getMonth()) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
								}}
							>
								{d.getDate()}
								{marks.length > 0 && (
									<span className="pointer-events-none absolute inset-x-0 bottom-px flex justify-center gap-0.5">
										{marks.map((c) => (
											<i key={c} className="size-0.75 rounded-full" style={{ background: isToday ? "#fff" : c }} />
										))}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
