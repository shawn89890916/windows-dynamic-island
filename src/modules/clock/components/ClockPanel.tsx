import { CircleIcon, LoaderCircleIcon, PlusIcon, RefreshCwIcon, SlidersIcon } from "lucide-react";
import { useEffect, useMemo, useState, type WheelEvent } from "react";
import navopathLogo from "../../../assets/navopath.png";
import { command } from "../../../core/bridge";
import { cn } from "../../../core/cn";
import { useLocale, useT } from "../../../core/i18n";
import { useIsland } from "../../../core/island";
import { useNavoPath } from "../../../core/plugins/useNavoPath";
import { useNavoPathConnection } from "../../../core/plugins/useNavoPathConnection";
import { localDateKey, taskStartOnDate, tasksOnNavoPathDate } from "../navopathCalendar";
import "../../../core/plugins/widgets/NavoPathWidget.css";
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
	const { keepOpen } = useIsland();
	const now = useNow(1000);
	const today = new Date(now);
	const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
	const [selected, setSelected] = useState<Date | null>(null);

	// NavoPath state
	const navopathEnabled = useSetting(navopathSettings.enabled);
	const { endpoint, token } = useNavoPathConnection();
	const { summary, tasks, loading, error, adding, completingId, addTask, completeTask, loadData } = useNavoPath(
		endpoint,
		token,
		navopathEnabled,
		Number.MAX_SAFE_INTEGER,
	);
	const [newTaskTitle, setNewTaskTitle] = useState("");

	const events = calendar?.events;
	const calendars = calendar?.calendars;
	const dots = useMemo(() => dayDots(events ?? [], calendars ?? []), [events, calendars]);
	const colors = useMemo(() => new Map((calendars ?? []).map((c) => [c.key, c.color])), [calendars]);
	const hasSources = !!calendars?.length;

	const [activeTab, setActiveTab] = useState<"calendar" | "navopath">(() => (hasSources ? "calendar" : "navopath"));

	useEffect(() => {
		return () => {
			keepOpen(false, "calendar-navopath");
		};
	}, [keepOpen]);

	const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		await completeTask(taskId);
	};
	const handleCreateTask = async (e: React.FormEvent) => {
		e.preventDefault();
		const title = newTaskTitle.trim();
		if (title && !adding && (await addTask(title))) setNewTaskTitle("");
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
	const focusDate = localDateKey(focus);
	const dateTasks = tasksOnNavoPathDate(tasks, focusDate, sameDay(focus, today));
	const busy = adding || completingId !== null;
	const status = loading ? "connecting" : error ? "disconnected" : summary ? "connected" : "connecting";
	useEffect(() => {
		keepOpen(busy, "calendar-navopath-request");
		return () => keepOpen(false, "calendar-navopath-request");
	}, [busy, keepOpen]);
	const openConnectionSettings = () => {
		localStorage.setItem("settings_navigate", "/plugins/com.island.navopath");
		void command("open_settings");
	};
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

	return (
		<div
			className="navopath-calendar flex h-full items-stretch justify-between gap-5 px-1"
			onClick={(e) => e.stopPropagation()}
		>
			{/* Left Column: Clock Header, Segment Tabs & Task/Event Stream */}
			<div className="flex flex-1 min-w-0 min-h-0 flex-col gap-2 py-1">
				{/* Top Bar: Time, Date & NavoPath Switcher */}
				<div className="flex flex-col gap-1">
					<div>
						<div className="flex items-baseline gap-1.5">
							<span className="font-[Segoe_UI_Variable_Display,Segoe_UI,sans-serif] text-[32px]/none font-[700] tracking-[-0.02em] tabular-nums">
								{time}
							</span>
							<span className="text-[14px] font-semibold text-text-faint">{seconds}</span>
						</div>
						<div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
							<span className="text-[12px] font-semibold text-text-dim first-letter:uppercase">{longDate}</span>
							<span className="text-[11px] text-text-faint">
								{selected && !sameDay(selected, today) ? relative : t("clock.week", { n: isoWeek(focus) })}
							</span>
						</div>
					</div>

					{/* View Switcher or NavoPath Quick Open */}
					{hasSources && navopathEnabled ? (
						<div className="flex self-start items-center gap-1 rounded-full bg-white/6 p-0.5" role="tablist">
							<button
								type="button"
								role="tab"
								aria-selected={activeTab === "calendar"}
								className={cn(
									"whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
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
									"flex whitespace-nowrap items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
									activeTab === "navopath" ? "bg-white/12 text-text" : "text-text-faint hover:text-text-dim",
								)}
								onClick={() => setActiveTab("navopath")}
							>
								<span>NavoPath</span>
								{tasks.length > 0 && (
									<span className="rounded-full bg-(--navo-raised) px-1 text-[9.5px] text-(--navo-ink) font-bold">
										{tasks.length}
									</span>
								)}
							</button>
						</div>
					) : navopathEnabled ? (
						<button
							type="button"
							onClick={openConnectionSettings}
							className="navopath-open"
							aria-label={t("marketplace.widgets.navopath.settings")}
						>
							<img src={navopathLogo} alt="" className="size-3.5 object-contain" />
							<span>NavoPath</span>
						</button>
					) : null}
				</div>

				{/* Center Content: NavoPath Tasks OR Calendar Events */}
				{activeTab === "navopath" && navopathEnabled ? (
					<section className="flex min-h-0 flex-1 flex-col gap-1.5" aria-label="NavoPath">
						<div className="navopath-meta items-center">
							<span role="status">
								{token ? t(`marketplace.widgets.navopath.${status}`) : t("calendar.navopath.notConfigured")}
								{summary ? ` · ${dateTasks.length} ${t("marketplace.widgets.navopath.open")}` : ""}
							</span>
							<div className="flex">
								<button
									type="button"
									className="navopath-icon-button"
									disabled={loading || busy || !token}
									onClick={() => void loadData()}
									aria-label={t("marketplace.widgets.navopath.refresh")}
								>
									<RefreshCwIcon size={12} className={loading ? "animate-spin" : ""} />
								</button>
								<button
									type="button"
									className="navopath-icon-button"
									onClick={openConnectionSettings}
									aria-label={t("marketplace.widgets.navopath.settings")}
								>
									<SlidersIcon size={12} />
								</button>
							</div>
						</div>
						{error && (
							<p className="navopath-error" role="alert">
								{t("marketplace.widgets.navopath.syncError")}
							</p>
						)}
						<div className="navopath-task-list" data-scroll data-no-drag>
							{!token ? (
								<button type="button" onClick={openConnectionSettings} className="navopath-open">
									{t("calendar.navopath.configureShared")}
								</button>
							) : dateTasks.length ? (
								<ul>
									{dateTasks.map((task) => (
										<li key={task.id}>
											<button
												type="button"
												className="navopath-icon-button navopath-checkbox"
												disabled={busy}
												onClick={(event) => void handleCompleteTask(task.id, event)}
												aria-label={`${t("marketplace.widgets.navopath.completeTask")}: ${task.title}`}
											>
												{completingId === task.id ? (
													<LoaderCircleIcon size={15} className="animate-spin" />
												) : (
													<CircleIcon size={15} />
												)}
											</button>
											{taskStartOnDate(task, focusDate) && (
												<time className="navopath-task-date">{taskStartOnDate(task, focusDate)}</time>
											)}
											<span className="navopath-task-title" title={task.title}>
												{task.title}
											</span>
										</li>
									))}
								</ul>
							) : (
								<p className="navopath-empty">
									{loading
										? t("marketplace.widgets.navopath.connecting")
										: error
											? t("marketplace.widgets.navopath.retryHint")
											: t("calendar.navopath.noTasksOnDate")}
								</p>
							)}
						</div>
						<form data-no-drag onSubmit={handleCreateTask} className="navopath-add">
							<input
								value={newTaskTitle}
								maxLength={300}
								readOnly={adding}
								disabled={!token}
								onChange={(event) => setNewTaskTitle(event.target.value)}
								onMouseDown={() => void command("focus_island")}
								onFocus={() => keepOpen(true, "calendar-navopath")}
								onBlur={() => keepOpen(false, "calendar-navopath")}
								onKeyDown={(event) => {
									event.stopPropagation();
									if (event.key === "Escape") event.currentTarget.blur();
									if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
								}}
								aria-label={t("calendar.navopath.addPlaceholder")}
								placeholder={t("calendar.navopath.addPlaceholder")}
							/>
							<button
								type="submit"
								className="navopath-icon-button"
								disabled={!token || busy || !newTaskTitle.trim()}
								aria-label={t("marketplace.widgets.navopath.addTask")}
							>
								{adding ? <LoaderCircleIcon size={15} className="animate-spin" /> : <PlusIcon size={15} />}
							</button>
						</form>
					</section>
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
							className="h-5 rounded-[10px] bg-(--navo-raised) px-2 text-[11px] font-[650] text-(--navo-ink)"
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
							d.getMonth() !== month.getMonth() && "text-(--navo-muted)",
							selected && sameDay(d, selected) && "text-text shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.5)]",
							isToday && "bg-(--navo-accent) font-[750] text-[#1b1b1b] hover:bg-(--navo-accent)",
						);
						const rawMarks = dots.get(d.toDateString()) ?? [];
						const dayTaskCount = navopathEnabled ? tasksOnNavoPathDate(tasks, localDateKey(d)).length : 0;
						const marks = dayTaskCount > 0 ? [...rawMarks, "#A9A49B"] : rawMarks;

						return (
							<button
								type="button"
								key={d.toDateString()}
								aria-label={`${new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(d)}${dayTaskCount ? ` · NavoPath ${dayTaskCount}` : ""}`}
								aria-pressed={sameDay(d, focus)}
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
