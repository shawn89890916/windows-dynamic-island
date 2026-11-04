import {
	BookOpenIcon,
	CalendarDaysIcon,
	ExternalLinkIcon,
	FileTextIcon,
	FolderOpenIcon,
	PenLineIcon,
	PlusIcon,
	SearchIcon,
	SparklesIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { command } from "../../../core/bridge";
import { useLocale, useT } from "../../../core/i18n";
import { useIsland } from "../../../core/island";
import {
	fetchRecentNotes,
	type ObsidianNote,
	openDailyNote,
	openInFolder,
	openObsidianNote,
	openObsidianVault,
	quickCaptureToObsidian,
	searchObsidian,
} from "../obsidianClient";
import { quickCaptureName } from "../obsidianDailyNote";
import { getInstalledPlugins, updatePluginSettings, useInstalledPlugins } from "../registry";
import { NeedsConfigCard } from "./NeedsConfigCard";

export { ObsidianIconSvg } from "../../../assets/ObsidianIcon";

import { ObsidianIconSvg } from "../../../assets/ObsidianIcon";

type TabType = "capture" | "recent" | "search";

export function ObsidianWidget({ settings }: { settings: Record<string, unknown> }) {
	const plugins = useInstalledPlugins();
	const t = useT();
	const locale = useLocale();
	const island = useIsland();

	const vaultPath = String(settings.vaultPath || "").trim();
	const rawVaultName = String(settings.vaultName || "").trim();
	const derivedVaultName = vaultPath
		? vaultPath.split(/[\\/]/).filter(Boolean).pop() || "Obsidian Vault"
		: "Obsidian Vault";
	const vaultName = vaultPath ? derivedVaultName : rawVaultName;
	const isConfigured = Boolean(vaultPath || rawVaultName);
	const dailyFolder = String(settings.dailyFolder ?? "");
	const dailyDateFormat = String(settings.dailyDateFormat || "YYYY-MM-DD");
	const captureNameFormat = String(settings.captureNameFormat || "YYYY-MM-DD");
	const openAfterSave = Boolean(settings.openAfterSave);
	const httpPort = Number(
		plugins.find((p) => p.manifest.id === "com.island.everything")?.customSettings.httpPort ||
			settings.httpPort ||
			8080,
	);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const [indexReady, setIndexReady] = useState(false);

	const [activeTab, setActiveTab] = useState<TabType>("capture");
	const [recentNotes, setRecentNotes] = useState<ObsidianNote[]>([]);
	const [captureText, setCaptureText] = useState("");
	const [captureError, setCaptureError] = useState(false);
	const [captureFolder, setCaptureFolder] = useState(String(settings.captureFolder ?? ""));
	const [selectedTag, setSelectedTag] = useState<string>(() =>
		t("marketplace.widgets.pluginExtras.obsidian.tags.inspiration"),
	);
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
		if (!vaultName && !vaultPath) return;
		let active = true;
		setIndexReady(false);
		setConnectionError(null);
		fetchRecentNotes(vaultName, httpPort, vaultPath)
			.then((notes) => {
				if (active) {
					setRecentNotes(notes);
					setIndexReady(true);
				}
			})
			.catch((err: unknown) => {
				if (active) setConnectionError(err instanceof Error ? err.message : String(err));
			});
		return () => {
			active = false;
		};
	}, [vaultName, vaultPath, httpPort]);

	if (!isConfigured) {
		return (
			<NeedsConfigCard
				pluginId="com.island.obsidian"
				title={t("marketplace.widgets.pluginExtras.obsidian.needsTitle")}
				description={t("marketplace.widgets.pluginExtras.obsidian.needsDescription")}
				icon={<ObsidianIconSvg size={18} />}
				accentColor="#8B5CF6"
				externalUrl="obsidian://"
				externalLabel={t("marketplace.widgets.obsidian.openApp")}
				settingsDefs={
					getInstalledPlugins().find((p) => p.manifest.id === "com.island.obsidian")?.manifest.settings ?? []
				}
				currentSettings={settings}
			/>
		);
	}

	const handleCapture = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!captureText.trim()) return;
		let captureName: string;
		try {
			captureName = quickCaptureName(new Date(), captureNameFormat);
		} catch {
			setCaptureError(true);
			return;
		}

		const ok = quickCaptureToObsidian(
			vaultName,
			captureName,
			captureText,
			[selectedTag],
			vaultPath,
			captureFolder,
			openAfterSave,
		);
		if (ok) {
			setCaptureError(false);
			setCapturedSuccess(true);
			setCaptureText("");
			setTimeout(() => setCapturedSuccess(false), 2200);
		}
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;
		searchObsidian(vaultName, searchQuery.trim(), vaultPath);
	};

	const todayStr = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" }).format(new Date());

	const PRESET_TAGS = [
		t("marketplace.widgets.pluginExtras.obsidian.tags.inspiration"),
		t("marketplace.widgets.pluginExtras.obsidian.tags.todo"),
		t("marketplace.widgets.pluginExtras.obsidian.tags.journal"),
		t("marketplace.widgets.pluginExtras.obsidian.tags.project"),
	];
	const captureFolders = Array.from(
		new Set([
			captureFolder,
			dailyFolder,
			...recentNotes.map((note) => (note.folder === "根目录" ? "" : note.folder)),
		].filter(Boolean)),
	).sort((a, b) => a.localeCompare(b, locale));

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
						<span className="truncate text-[10px] text-text-faint font-mono block" title={vaultPath || vaultName}>
							{vaultPath ? vaultPath.split(/[\\/]/).pop() : vaultName}
						</span>
					</div>
				</div>

				{/* Fast Action Buttons: Open Vault & Daily Note */}
				<div className="flex flex-col gap-1.5">
					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => {
							try {
								openDailyNote(vaultName, dailyFolder, vaultPath, dailyDateFormat);
							} catch (err) {
								setConnectionError(err instanceof Error ? err.message : String(err));
							}
						}}
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

					<div className="flex items-center gap-1">
						<motion.button
							type="button"
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={() => openObsidianVault(vaultName, vaultPath)}
							className="flex flex-1 items-center justify-between rounded-xl bg-white/4 border border-white/6 px-2.5 py-1.5 text-xs text-text-muted hover:text-text hover:bg-white/8 transition-colors cursor-pointer"
						>
							<div className="flex items-center gap-1.5">
								<BookOpenIcon size={13} className="text-text-faint" />
								<span className="text-[11px]">{t("marketplace.widgets.obsidian.openApp")}</span>
							</div>
							<ExternalLinkIcon size={11} className="text-text-faint" />
						</motion.button>

						{vaultPath && (
							<motion.button
								type="button"
								whileHover={{ scale: 1.06 }}
								whileTap={{ scale: 0.92 }}
								title={t("marketplace.widgets.pluginExtras.obsidian.openFolder")}
								onClick={() => openInFolder(vaultPath)}
								className="flex size-7.5 shrink-0 items-center justify-center rounded-xl bg-white/4 border border-white/6 text-text-faint hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
							>
								<FolderOpenIcon size={13} />
							</motion.button>
						)}
					</div>
				</div>

				{/* Micro Footer Status */}
				<div className="flex items-center justify-between text-[10px] text-text-faint border-t border-white/5 pt-1">
					<span role={connectionError ? "alert" : "status"}>
						{connectionError ||
							(indexReady
								? t("marketplace.widgets.obsidian.statusConnected")
								: t("marketplace.widgets.pluginExtras.obsidian.checkingIndex"))}
					</span>
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

								<div className="flex items-center justify-between px-1 text-[10.5px]">
									<label className="flex items-center gap-2 text-text-faint">
										<span>{t("marketplace.widgets.obsidian.saveTo")}</span>
										<select
											value={captureFolder}
											onChange={(event) => {
												const value = event.target.value;
												setCaptureFolder(value);
												updatePluginSettings("com.island.obsidian", { captureFolder: value });
											}}
											className="max-w-48 cursor-pointer bg-transparent text-text-faint outline-none"
										>
											<option value="" className="bg-neutral-900">
												{t("marketplace.widgets.obsidian.vaultRoot")}
											</option>
											{captureFolders.map((folder) => (
												<option key={folder} value={folder} className="bg-neutral-900">
													{folder}
												</option>
											))}
										</select>
									</label>
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
								{captureError && (
									<p className="px-1 text-[10px] text-red-300">
										{t("marketplace.widgets.obsidian.invalidCaptureNameFormat")}
									</p>
								)}
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
								{recentNotes.length > 0 ? (
									recentNotes.slice(0, 3).map((note) => (
										<motion.div
											key={note.path}
											whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
											onClick={() => openObsidianNote(vaultName, note.path, vaultPath)}
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
									))
								) : (
									<div className="flex flex-col items-center justify-center py-2 text-center text-text-faint">
										<p className="text-[11px] text-text-dim">
											{t("marketplace.widgets.pluginExtras.obsidian.noNotes")}
										</p>
										<p className="text-[10px] text-text-faint mt-0.5">
											{t("marketplace.widgets.pluginExtras.obsidian.indexHint")}
										</p>
									</div>
								)}
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
