import { CheckCircle2Icon, CheckIcon, CircleIcon, ExternalLinkIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import navopathLogo from "../../../assets/navopath.png";
import { command, openExternal } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { useIsland } from "../../../core/island";
import {
	completeNavoPathTask,
	createNavoPathTask,
	fetchNavoPathSummary,
	fetchNavoPathTasks,
	type NavoPathSummary,
	type NavoPathTask,
} from "../navopathMcp";
import { NeedsConfigCard } from "./NeedsConfigCard";

const DEFAULT_ENDPOINT = "https://navopath-mcp.shawn89890916.workers.dev/mcp";

export function NavoPathWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const island = useIsland();
	const inputRef = useRef<HTMLInputElement>(null);

	const defaultToken = "nvp_13bded77b94e65938c7487640e6b94a15d29de62326c7085fb40c3409d6f252e";
	const endpoint = String(settings.mcpEndpoint || DEFAULT_ENDPOINT);
	const token = String(settings.token || defaultToken).trim();
	const isConfigured = Boolean(token);

	const [summary, setSummary] = useState<NavoPathSummary | null>(() => {
		try {
			const saved = localStorage.getItem("island_navopath_summary");
			return saved ? JSON.parse(saved) : null;
		} catch {
			return null;
		}
	});

	const [tasks, setTasks] = useState<NavoPathTask[]>(() => {
		try {
			const saved = localStorage.getItem("island_navopath_tasks");
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	});

	const [loading, setLoading] = useState(false);
	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [completingId, setCompletingId] = useState<string | null>(null);

	useEffect(() => {
		return () => {
			island.keepOpen(false, "navopath");
		};
	}, [island]);

	const loadData = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		try {
			const [sum, taskList] = await Promise.all([
				fetchNavoPathSummary(endpoint, token).catch(() => null),
				fetchNavoPathTasks(endpoint, token).catch(() => []),
			]);
			if (sum) {
				setSummary(sum);
				localStorage.setItem("island_navopath_summary", JSON.stringify(sum));
			}
			setTasks(taskList);
			localStorage.setItem("island_navopath_tasks", JSON.stringify(taskList));
		} finally {
			setLoading(false);
		}
	}, [endpoint, token]);

	useEffect(() => {
		if (isConfigured) {
			loadData();
		}
	}, [isConfigured, loadData]);

	if (!isConfigured) {
		return (
			<NeedsConfigCard
				pluginId="com.island.navopath"
				title="NavoPath 规划器"
				description="未配置 MCP Token。请输入 NavoPath 服务端点与 Token 凭据以同步任务与规划。"
				icon={<img src={navopathLogo} alt="NavoPath" className="size-4.5 object-contain" />}
				accentColor="#F97316"
				externalUrl="https://navopath-planner.vercel.app"
				externalLabel="获取 Token"
				settingsDefs={[
					{
						key: "mcpEndpoint",
						label: "MCP 服务端点",
						type: "text",
						default: DEFAULT_ENDPOINT,
					},
					{
						key: "token",
						label: "Token 凭证 (nvp_...)",
						type: "password",
						default: "",
					},
				]}
				currentSettings={settings}
			/>
		);
	}

	const handleComplete = async (taskId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setCompletingId(taskId);
		// Optimistic update
		const target = tasks.find((t) => t.id === taskId);
		setTasks((prev) => prev.filter((t) => t.id !== taskId));
		if (summary) {
			setSummary({
				...summary,
				openTasks: Math.max(0, summary.openTasks - 1),
				completedTasks: summary.completedTasks + 1,
			});
		}

		try {
			await completeNavoPathTask(endpoint, token, taskId);
		} catch (err) {
			console.error("Failed to complete task via MCP:", err);
			// Rollback on error
			if (target) setTasks((prev) => [target, ...prev]);
		} finally {
			setCompletingId(null);
		}
	};

	const handleAddTask = async (e: React.FormEvent | React.KeyboardEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const title = newTaskTitle.trim();
		if (!title) return;

		setNewTaskTitle("");
		const tempId = `temp_${Date.now()}`;
		const optimisticTask: NavoPathTask = {
			id: tempId,
			title,
			priority: "medium",
			workflowStatus: "todo",
		};
		setTasks((prev) => [optimisticTask, ...prev]);
		if (summary) {
			setSummary({ ...summary, openTasks: summary.openTasks + 1 });
		}

		try {
			const created = await createNavoPathTask(endpoint, token, title);
			if (created?.id) {
				setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
			}
		} catch (err) {
			console.error("Failed to create task via MCP:", err);
		}
	};

	const activeHeroTask = tasks[0];
	const secondaryTasks = tasks.slice(1, 3);

	return (
		<div className="flex h-full flex-col justify-center gap-2 px-1 select-none">
			{/* Top Bar: NavoPath Title, Live MCP Stats & Actions */}
			<div className="flex items-center justify-between border-b border-white/8 pb-1.5">
				<div className="flex items-center gap-3 min-w-0">
					<motion.div
						whileHover={{ rotate: 10, scale: 1.05 }}
						transition={{ type: "spring", stiffness: 450, damping: 20 }}
						className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-1.5 shadow-sm"
					>
						<img src={navopathLogo} alt="NavoPath" className="size-full object-contain" />
					</motion.div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<span className="text-[13px] font-semibold text-text whitespace-nowrap">
								{t("marketplace.widgets.navopath.title")}
							</span>
							<span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.2 text-[10px] font-medium text-orange-400 shrink-0 whitespace-nowrap border border-orange-500/25">
								<span className="size-1.5 rounded-full bg-orange-400 animate-pulse" />
								<span>MCP Live</span>
							</span>
						</div>
						<p className="text-[10.5px] text-text-faint whitespace-nowrap font-mono">
							{summary
								? `${summary.openTasks} ${t("marketplace.widgets.navopath.open")} · ${summary.completedTasks} ${t("marketplace.widgets.navopath.done")} · ${summary.projects} ${t("marketplace.widgets.navopath.projects")}`
								: t("marketplace.widgets.navopath.connecting")}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0 ml-2">
					<motion.button
						type="button"
						whileHover={{ scale: 1.08 }}
						whileTap={{ scale: 0.88 }}
						transition={{ type: "spring", stiffness: 500, damping: 24 }}
						onClick={loadData}
						title={t("marketplace.widgets.navopath.refresh")}
						className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-text-faint transition-colors hover:bg-white/18 hover:text-white"
					>
						<RefreshCwIcon size={12} className={loading ? "animate-spin text-orange-400" : ""} />
					</motion.button>
					<motion.button
						type="button"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.92 }}
						transition={{ type: "spring", stiffness: 500, damping: 25 }}
						onClick={(e) => {
							e.stopPropagation();
							openExternal("navopath://");
						}}
						className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-text transition-colors hover:bg-white/18 active:scale-95 whitespace-nowrap"
					>
						<span>{t("marketplace.widgets.navopath.openApp")}</span>
						<ExternalLinkIcon size={11} className="opacity-60" />
					</motion.button>
				</div>
			</div>

			{/* Main Grid: Left Hero Spotlight Card + Right Quick Add & Tasks */}
			<div className="grid grid-cols-12 gap-2.5 pt-0.5 min-h-0">
				{/* Left Hero Focus Card (5 cols) */}
				<div className="col-span-5 flex flex-col justify-between rounded-xl bg-white/4 border border-white/6 p-2.5">
					<div className="flex items-center justify-between text-[10.5px] text-text-faint font-medium">
						<span className="text-orange-400 font-semibold">{t("marketplace.widgets.navopath.heroFocus")}</span>
						{activeHeroTask?.plannedForDate && (
							<span className="font-mono text-[9.5px] rounded bg-white/6 px-1.5 py-0.2">
								{activeHeroTask.plannedForDate}
							</span>
						)}
					</div>

					<div className="my-1.5 min-w-0">
						{activeHeroTask ? (
							<p className="text-xs font-semibold text-text leading-snug line-clamp-2" title={activeHeroTask.title}>
								{activeHeroTask.title}
							</p>
						) : (
							<p className="text-xs text-text-faint italic">{t("marketplace.widgets.navopath.noTasks")}</p>
						)}
					</div>

					<motion.button
						type="button"
						disabled={!activeHeroTask || completingId === activeHeroTask.id}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.94 }}
						transition={{ type: "spring", stiffness: 480, damping: 25 }}
						onClick={(e) => activeHeroTask && handleComplete(activeHeroTask.id, e)}
						className="flex h-7.5 w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold transition-colors hover:bg-orange-500 hover:text-white disabled:opacity-30 whitespace-nowrap"
					>
						<CheckIcon size={13} />
						<span>{t("marketplace.widgets.navopath.completeTask")}</span>
					</motion.button>
				</div>

				{/* Right Column: Upcoming Tasks + Quick Add (7 cols) */}
				<div className="col-span-7 flex flex-col justify-between min-w-0">
					{/* 2 Upcoming Tasks with Checkboxes */}
					<div className="flex flex-col gap-1">
						{secondaryTasks.length === 0 ? (
							<div className="py-2 text-center text-xs text-text-faint">
								{t("marketplace.widgets.navopath.allDone")}
							</div>
						) : (
							<AnimatePresence initial={false}>
								{secondaryTasks.map((task) => (
									<motion.div
										key={task.id}
										layout
										initial={{ opacity: 0, y: -4 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.9 }}
										transition={{ type: "spring", stiffness: 450, damping: 28 }}
										className="group flex items-center justify-between rounded-lg bg-white/3 border border-white/5 px-2 py-1 text-xs transition-colors hover:border-white/12 hover:bg-white/6"
									>
										<div className="flex items-center gap-1.5 min-w-0 flex-1">
											<motion.button
												type="button"
												whileHover={{ scale: 1.15 }}
												whileTap={{ scale: 0.85 }}
												onClick={(e) => handleComplete(task.id, e)}
												className="text-text-faint hover:text-orange-400 transition-colors shrink-0"
											>
												{task.completed ? (
													<CheckCircle2Icon size={14} className="text-orange-400" />
												) : (
													<CircleIcon size={14} />
												)}
											</motion.button>
											<span className="truncate text-[11.5px] font-medium text-text">{task.title}</span>
										</div>
									</motion.div>
								))}
							</AnimatePresence>
						)}
					</div>

					{/* Quick Add Input Bar (Uses keepOpen and data-no-drag against collapsing) */}
					<form onSubmit={handleAddTask} className="flex items-center gap-1.5 pt-1" data-no-drag>
						<input
							ref={inputRef}
							type="text"
							value={newTaskTitle}
							onChange={(e) => setNewTaskTitle(e.target.value)}
							onFocus={() => {
								island.keepOpen(true, "navopath");
							}}
							onBlur={() => {
								island.keepOpen(false, "navopath");
							}}
							onMouseDown={() => {
								island.keepOpen(true, "navopath");
								command("focus_island");
							}}
							onKeyDown={(e) => {
								e.stopPropagation();
								if (e.key === "Escape") {
									inputRef.current?.blur();
									island.keepOpen(false, "navopath");
								}
							}}
							placeholder={t("marketplace.widgets.navopath.addPlaceholder")}
							className="h-7 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-text placeholder:text-text-faint focus:border-orange-500/50 focus:outline-none transition-colors"
						/>
						<motion.button
							type="submit"
							disabled={!newTaskTitle.trim()}
							whileHover={{ scale: 1.08 }}
							whileTap={{ scale: 0.9 }}
							transition={{ type: "spring", stiffness: 500, damping: 25 }}
							className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition-opacity hover:bg-orange-400 disabled:opacity-30"
						>
							<PlusIcon size={13} />
						</motion.button>
					</form>
				</div>
			</div>
		</div>
	);
}
