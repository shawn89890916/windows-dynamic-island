import {
	BookOpenIcon,
	CalendarDaysIcon,
	ExternalLinkIcon,
	FileTextIcon,
	PenLineIcon,
	PlusIcon,
	SearchIcon,
	SparklesIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { command } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { useIsland } from "../../../core/island";
import {
	fetchRecentNotes,
	type ObsidianNote,
	openDailyNote,
	openObsidianNote,
	openObsidianVault,
	quickCaptureToObsidian,
	searchObsidian,
} from "../obsidianClient";
import { NeedsConfigCard } from "./NeedsConfigCard";

export function ObsidianIconSvg({ size = 16, className = "" }: { size?: number; className?: string }) {
	return (
		<svg
			role="img"
			viewBox="0 0 24 24"
			width={size}
			height={size}
			fill="currentColor"
			className={className}
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Obsidian</title>
			<path d="M19.355 18.538a68.967 68.959 0 0 0 1.858-2.954.81.81 0 0 0-.062-.9c-.516-.685-1.504-2.075-2.042-3.362-.553-1.321-.636-3.375-.64-4.377a1.707 1.707 0 0 0-.358-1.05l-3.198-4.064a3.744 3.744 0 0 1-.076.543c-.106.503-.307 1.004-.536 1.5-.134.29-.29.6-.446.914l-.31.626c-.516 1.068-.997 2.227-1.132 3.59-.124 1.26.046 2.73.815 4.481.128.011.257.025.386.044a6.363 6.363 0 0 1 3.326 1.505c.916.79 1.744 1.922 2.415 3.5zM8.199 22.569c.073.012.146.02.22.02.78.024 2.095.092 3.16.29.87.16 2.593.64 4.01 1.055 1.083.316 2.198-.548 2.355-1.664.114-.814.33-1.735.725-2.58l-.01.005c-.67-1.87-1.522-3.078-2.416-3.849a5.295 5.295 0 0 0-2.778-1.257c-1.54-.216-2.952.19-3.84.45.532 2.218.368 4.829-1.425 7.531zM5.533 9.938c-.023.1-.056.197-.098.29L2.82 16.059a1.602 1.602 0 0 0 .313 1.772l4.116 4.24c2.103-3.101 1.796-6.02.836-8.3-.728-1.73-1.832-3.081-2.55-3.831zM9.32 14.01c.615-.183 1.606-.465 2.745-.534-.683-1.725-.848-3.233-.716-4.577.154-1.552.7-2.847 1.235-3.95.113-.235.223-.454.328-.664.149-.297.288-.577.419-.86.217-.47.379-.885.46-1.27.08-.38.08-.72-.014-1.043-.095-.325-.297-.675-.68-1.06a1.6 1.6 0 0 0-1.475.36l-4.95 4.452a1.602 1.602 0 0 0-.513.952l-.427 2.83c.672.59 2.328 2.316 3.335 4.711.09.21.175.43.253.653z" />
		</svg>
	);
}

type TabType = "capture" | "recent" | "search";

export function ObsidianWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const island = useIsland();

	const isConfigured = Boolean(settings.configured && settings.vaultName);
	const vaultName = String(settings.vaultName || "").trim();
	const dailyFolder = String(settings.dailyFolder || "Daily notes");
	const httpPort = Number(settings.httpPort || 8080);

	const [activeTab, setActiveTab] = useState<TabType>("capture");
	const [recentNotes, setRecentNotes] = useState<ObsidianNote[]>([]);
	const [captureText, setCaptureText] = useState("");
	const [selectedTag, setSelectedTag] = useState<string>("#灵感");
	const [capturedSuccess, setCapturedSuccess] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const inputRef = useRef<HTMLInputElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		return () => {
			island.keepOpen(false, "obsidian");
		};
	}, [island]);

	useEffect(() => {
		if (!vaultName) return;
		let active = true;
		fetchRecentNotes(vaultName, httpPort).then((notes) => {
			if (active) setRecentNotes(notes);
		});
		return () => {
			active = false;
		};
	}, [vaultName, httpPort]);

	if (!isConfigured) {
		return (
			<NeedsConfigCard
				pluginId="com.island.obsidian"
				title="Obsidian 知识库"
				description="未配置知识库仓库。请输入您的 Obsidian 仓库名称以打通闪念速记、每日日记与笔记快速检索。"
				icon={<ObsidianIconSvg size={18} />}
				accentColor="#8B5CF6"
				externalUrl="obsidian://"
				externalLabel="打开 Obsidian"
				settingsDefs={[
					{
						key: "vaultName",
						label: "Obsidian 仓库名称 (必须与 Obsidian 中完全一致)",
						type: "text",
						default: "",
					},
					{
						key: "dailyFolder",
						label: "日记文件夹 (例如 Daily notes)",
						type: "text",
						default: "Daily notes",
					},
				]}
				currentSettings={settings}
			/>
		);
	}

	const handleCapture = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!captureText.trim()) return;

		const ok = quickCaptureToObsidian(
			vaultName,
			`灵动速记-${new Date().toLocaleTimeString().replace(/:/g, "-")}`,
			captureText,
			[selectedTag],
		);
		if (ok) {
			setCapturedSuccess(true);
			setCaptureText("");
			setTimeout(() => setCapturedSuccess(false), 2200);
		}
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;
		searchObsidian(vaultName, searchQuery.trim());
	};

	const todayStr = `${new Date().getMonth() + 1}月${new Date().getDate()}日`;

	const PRESET_TAGS = ["#灵感", "#待办", "#随笔", "#项目"];

	return (
		<div className="flex h-full items-stretch gap-3 select-none px-1 py-0.5">
			{/* Left Column: Brand Hero + Fast App Links */}
			<div className="flex w-[190px] shrink-0 flex-col justify-between border-r border-white/8 pr-3">
				{/* Header: Obsidian Icon & Vault Title */}
				<div className="flex items-center gap-2.5">
					<motion.div
						whileHover={{ rotate: 10, scale: 1.05 }}
						transition={{ type: "spring", stiffness: 400, damping: 20 }}
						className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-purple-600/25 text-purple-400 p-2 shadow-inner border border-purple-500/30"
					>
						<ObsidianIconSvg size={18} />
					</motion.div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							<span className="truncate font-semibold text-text text-[13px]">Obsidian</span>
							<span className="size-1.5 rounded-full bg-emerald-400" />
						</div>
						<span className="truncate text-[10.5px] text-text-faint font-mono block">{vaultName}</span>
					</div>
				</div>

				{/* Fast Action Buttons: Open Vault & Daily Note */}
				<div className="flex flex-col gap-1.5">
					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => openDailyNote(vaultName, dailyFolder)}
						className="flex items-center justify-between rounded-xl bg-purple-500/15 border border-purple-500/25 px-2.5 py-1.5 text-xs text-purple-300 hover:bg-purple-500/22 transition-colors cursor-pointer"
					>
						<div className="flex items-center gap-1.5">
							<CalendarDaysIcon size={13} className="text-purple-400" />
							<span className="font-medium text-[11px]">{t("marketplace.widgets.obsidian.dailyNote")}</span>
						</div>
						<span className="rounded-md bg-purple-500/30 px-1.5 py-0.2 text-[9.5px] font-mono text-purple-200">
							{todayStr}
						</span>
					</motion.button>

					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => openObsidianVault(vaultName)}
						className="flex items-center justify-between rounded-xl bg-white/4 border border-white/6 px-2.5 py-1.5 text-xs text-text-muted hover:text-text hover:bg-white/8 transition-colors cursor-pointer"
					>
						<div className="flex items-center gap-1.5">
							<BookOpenIcon size={13} className="text-text-faint" />
							<span className="text-[11px]">{t("marketplace.widgets.obsidian.openApp")}</span>
						</div>
						<ExternalLinkIcon size={11} className="text-text-faint" />
					</motion.button>
				</div>

				{/* Micro Footer Status */}
				<div className="flex items-center justify-between text-[10px] text-text-faint border-t border-white/5 pt-1">
					<span>{t("marketplace.widgets.obsidian.statusConnected")}</span>
					<span className="font-mono text-[9px] opacity-75">v1.11+</span>
				</div>
			</div>

			{/* Right Column: Multi-tab Interactive Area */}
			<div className="flex flex-1 min-w-0 flex-col justify-between">
				{/* Top Nav: Tabs */}
				<div className="flex items-center justify-between border-b border-white/8 pb-1.5">
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => setActiveTab("capture")}
							className={`flex items-center gap-1 rounded-lg px-2.5 py-0.8 text-xs font-medium transition-colors ${
								activeTab === "capture"
									? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
									: "text-text-faint hover:text-text"
							}`}
						>
							<PenLineIcon size={12} />
							<span>{t("marketplace.widgets.obsidian.tabCapture")}</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("recent")}
							className={`flex items-center gap-1 rounded-lg px-2.5 py-0.8 text-xs font-medium transition-colors ${
								activeTab === "recent"
									? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
									: "text-text-faint hover:text-text"
							}`}
						>
							<FileTextIcon size={12} />
							<span>{t("marketplace.widgets.obsidian.tabRecent")}</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("search")}
							className={`flex items-center gap-1 rounded-lg px-2.5 py-0.8 text-xs font-medium transition-colors ${
								activeTab === "search"
									? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
									: "text-text-faint hover:text-text"
							}`}
						>
							<SearchIcon size={12} />
							<span>{t("marketplace.widgets.obsidian.tabSearch")}</span>
						</button>
					</div>

					{/* Tag selector or quick action info */}
					{activeTab === "capture" && (
						<div className="flex items-center gap-1">
							{PRESET_TAGS.map((tag) => (
								<button
									key={tag}
									type="button"
									onClick={() => setSelectedTag(tag)}
									className={`rounded-md px-1.5 py-0.2 text-[10px] transition-colors ${
										selectedTag === tag
											? "bg-purple-500/30 text-purple-200 border border-purple-500/40"
											: "bg-white/4 text-text-faint hover:text-text"
									}`}
								>
									{tag}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Content Switcher */}
				<div className="flex-1 flex flex-col justify-center min-h-0 pt-1">
					<AnimatePresence mode="wait">
						{activeTab === "capture" && (
							<motion.form
								key="tab-capture"
								initial={{ opacity: 0, y: 3 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -3 }}
								onSubmit={handleCapture}
								className="flex flex-col gap-2"
								data-no-drag
							>
								<div className="relative flex items-center rounded-xl bg-white/5 border border-white/8 focus-within:border-purple-400/50 px-2.5 py-1.5 transition-colors">
									<SparklesIcon size={14} className="text-purple-400 shrink-0 mr-2" />
									<input
										ref={inputRef}
										type="text"
										value={captureText}
										onChange={(e) => setCaptureText(e.target.value)}
										onFocus={() => island.keepOpen(true, "obsidian")}
										onBlur={() => island.keepOpen(false, "obsidian")}
										onMouseDown={() => {
											island.keepOpen(true, "obsidian");
											command("focus_island");
										}}
										placeholder={t("marketplace.widgets.obsidian.placeholderCapture")}
										className="flex-1 min-w-0 bg-transparent text-xs text-text placeholder:text-text-faint focus:outline-none"
									/>
									<motion.button
										type="submit"
										whileHover={{ scale: 1.08 }}
										whileTap={{ scale: 0.92 }}
										disabled={!captureText.trim()}
										className="flex items-center gap-1 rounded-lg bg-purple-600 px-2 py-1 text-[11px] font-medium text-white shadow hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
									>
										<PlusIcon size={12} />
										<span>{t("marketplace.widgets.obsidian.btnSave")}</span>
									</motion.button>
								</div>

								<div className="flex items-center justify-between text-[10.5px] px-1 text-text-faint">
									<span>{t("marketplace.widgets.obsidian.tipCapture")}</span>
									{capturedSuccess && (
										<motion.span
											initial={{ opacity: 0, scale: 0.9 }}
											animate={{ opacity: 1, scale: 1 }}
											className="font-medium text-emerald-400"
										>
											✓ {t("marketplace.widgets.obsidian.successCaptured")}
										</motion.span>
									)}
								</div>
							</motion.form>
						)}

						{activeTab === "recent" && (
							<motion.div
								key="tab-recent"
								initial={{ opacity: 0, y: 3 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -3 }}
								className="flex flex-col gap-1 min-h-0"
							>
								{recentNotes.slice(0, 3).map((note) => (
									<motion.div
										key={note.path}
										whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
										onClick={() => openObsidianNote(vaultName, note.path)}
										className="group flex items-center justify-between rounded-xl bg-white/4 border border-white/6 px-2.5 py-1 text-xs cursor-pointer hover:border-purple-500/30 transition-colors"
									>
										<div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
											<FileTextIcon size={14} className="text-purple-400 shrink-0" />
											<span className="truncate font-medium text-text text-[11.5px]">{note.name}</span>
											<span className="truncate text-[9.5px] text-text-faint font-mono bg-white/5 rounded px-1.5 py-0.2">
												{note.folder}
											</span>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span className="text-[10px] text-text-faint font-mono">{note.modifiedTime}</span>
											<ExternalLinkIcon size={11} className="text-text-faint group-hover:text-purple-300" />
										</div>
									</motion.div>
								))}
							</motion.div>
						)}

						{activeTab === "search" && (
							<motion.form
								key="tab-search"
								initial={{ opacity: 0, y: 3 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -3 }}
								onSubmit={handleSearch}
								className="flex flex-col gap-2"
								data-no-drag
							>
								<div className="flex items-center rounded-xl bg-white/5 border border-white/8 focus-within:border-purple-400/50 px-2.5 py-1.5 transition-colors">
									<SearchIcon size={14} className="text-purple-400 shrink-0 mr-2" />
									<input
										ref={searchInputRef}
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										onFocus={() => island.keepOpen(true, "obsidian")}
										onBlur={() => island.keepOpen(false, "obsidian")}
										onMouseDown={() => {
											island.keepOpen(true, "obsidian");
											command("focus_island");
										}}
										placeholder={t("marketplace.widgets.obsidian.placeholderSearch")}
										className="flex-1 min-w-0 bg-transparent text-xs text-text placeholder:text-text-faint focus:outline-none"
									/>
									<motion.button
										type="submit"
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										disabled={!searchQuery.trim()}
										className="flex items-center gap-1 rounded-lg bg-purple-600 px-2 py-1 text-[11px] font-medium text-white shadow hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
									>
										<span>{t("marketplace.widgets.obsidian.btnSearch")}</span>
									</motion.button>
								</div>
								<div className="flex items-center justify-between text-[10.5px] px-1 text-text-faint">
									<span>{t("marketplace.widgets.obsidian.tipSearch")}</span>
								</div>
							</motion.form>
						)}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
