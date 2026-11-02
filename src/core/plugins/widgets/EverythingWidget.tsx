import {
	CodeIcon,
	ExternalLinkIcon,
	FileArchiveIcon,
	FileIcon,
	FileImageIcon,
	FileTextIcon,
	FolderIcon,
	HelpCircleIcon,
	SearchIcon,
	XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { command } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { useIsland } from "../../../core/island";
import { type EverythingItem, formatFileSize, queryEverything } from "../everythingClient";

function getFileIcon(name: string, type: "file" | "folder") {
	if (type === "folder") return <FolderIcon size={16} className="text-amber-400 shrink-0" />;
	const ext = name.split(".").pop()?.toLowerCase();
	switch (ext) {
		case "ts":
		case "tsx":
		case "js":
		case "jsx":
		case "rs":
		case "py":
		case "html":
		case "json":
			return <CodeIcon size={16} className="text-sky-400 shrink-0" />;
		case "md":
		case "txt":
		case "doc":
		case "docx":
		case "pdf":
			return <FileTextIcon size={16} className="text-emerald-400 shrink-0" />;
		case "png":
		case "jpg":
		case "jpeg":
		case "gif":
		case "webp":
		case "svg":
			return <FileImageIcon size={16} className="text-purple-400 shrink-0" />;
		case "zip":
		case "rar":
		case "7z":
		case "tar":
		case "gz":
			return <FileArchiveIcon size={16} className="text-amber-400 shrink-0" />;
		default:
			return <FileIcon size={16} className="text-text-faint shrink-0" />;
	}
}

export function EverythingWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const island = useIsland();
	const inputRef = useRef<HTMLInputElement>(null);

	const port = Number(settings.httpPort || 8080);
	const [query, setQuery] = useState("");
	const [items, setItems] = useState<EverythingItem[]>([]);
	const [totalResults, setTotalResults] = useState(0);
	const [isConnected, setIsConnected] = useState(true);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [showHelp, setShowHelp] = useState(false);

	useEffect(() => {
		return () => {
			island.keepOpen(false, "everything");
		};
	}, [island]);

	useEffect(() => {
		let active = true;
		const searchVal = query.trim() || "Everything";
		queryEverything(searchVal, port, 3).then((res) => {
			if (!active) return;
			setIsConnected(res.ok);
			setItems(res.items);
			setTotalResults(res.total);
			setSelectedIndex(0);
		});
		return () => {
			active = false;
		};
	}, [query, port]);

	const openItem = (item: EverythingItem, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const targetUrl = item.path.includes(":") ? `file:///${item.path.replace(/\\/g, "/")}` : item.path;
		window.open(targetUrl, "_blank");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		e.stopPropagation();
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (items[selectedIndex]) {
				openItem(items[selectedIndex]);
			}
		} else if (e.key === "Escape") {
			e.preventDefault();
			if (query) {
				setQuery("");
			} else {
				inputRef.current?.blur();
				island.keepOpen(false, "everything");
			}
		}
	};

	return (
		<div className="flex h-full flex-col justify-center gap-1.5 px-1 select-none">
			{/* Top Bar: Search Bar with Input Protection & Connection Badge */}
			<div className="flex items-center justify-between border-b border-white/8 pb-1.5">
				<form
					onSubmit={(e) => e.preventDefault()}
					className="flex flex-1 items-center gap-2 rounded-xl bg-white/6 px-3 py-1 border border-white/8 focus-within:border-amber-400/50 transition-colors"
					data-no-drag
				>
					<SearchIcon size={15} className="text-amber-400 shrink-0" />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onFocus={() => {
							island.keepOpen(true, "everything");
						}}
						onBlur={() => {
							island.keepOpen(false, "everything");
						}}
						onMouseDown={() => {
							island.keepOpen(true, "everything");
							command("focus_island");
						}}
						onKeyDown={handleKeyDown}
						placeholder={t("marketplace.widgets.everything.placeholder")}
						className="min-w-0 flex-1 bg-transparent text-xs text-text placeholder:text-text-faint focus:outline-none"
					/>
					{query && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setQuery("");
								inputRef.current?.focus();
							}}
							className="rounded-full p-0.5 text-text-faint hover:text-text"
						>
							<XIcon size={13} />
						</button>
					)}
				</form>

				{/* Status & Help Pill */}
				<div className="flex items-center gap-2 shrink-0 ml-3">
					<motion.button
						type="button"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={(e) => {
							e.stopPropagation();
							setShowHelp(!showHelp);
						}}
						className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium border transition-colors ${
							isConnected
								? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
								: "bg-amber-500/15 text-amber-400 border-amber-500/25"
						}`}
					>
						<span
							className={`size-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}
						/>
						<span>
							{isConnected
								? t("marketplace.widgets.everything.connected", { port })
								: t("marketplace.widgets.everything.demoMode")}
						</span>
						<HelpCircleIcon size={11} className="opacity-70" />
					</motion.button>
				</div>
			</div>

			{/* Inline Quick Help Drawer when HTTP server is offline */}
			<AnimatePresence>
				{showHelp && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-200"
					>
						<p>{t("marketplace.widgets.everything.helpGuide", { port })}</p>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Results List: Top 3 Fast Results with Arrow Key Navigation */}
			<div className="flex flex-col gap-1 min-h-0 pt-0.5">
				{items.length === 0 ? (
					<div className="py-4 text-center text-xs text-text-faint">
						{t("marketplace.widgets.everything.noResults")}
					</div>
				) : (
					items.map((item, index) => {
						const isSelected = index === selectedIndex;
						return (
							<motion.div
								key={item.path}
								whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
								onClick={(e) => openItem(item, e)}
								className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors cursor-pointer border ${
									isSelected
										? "bg-white/12 border-amber-400/60 ring-1 ring-amber-400/40"
										: "bg-white/3 border-white/5 hover:border-white/12"
								}`}
							>
								{/* Left: Type Icon + Filename + Truncated Path */}
								<div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
									{getFileIcon(item.name, item.type)}
									<div className="flex flex-col min-w-0">
										<span className="truncate font-semibold text-text text-[12px]">{item.name}</span>
										<span className="truncate text-[10px] text-text-faint font-mono">{item.path}</span>
									</div>
								</div>

								{/* Right: Size + Action Buttons */}
								<div className="flex items-center gap-2 shrink-0">
									<span className="font-mono text-[10.5px] text-text-faint tabular-nums">
										{formatFileSize(item.size)}
									</span>
									<motion.button
										type="button"
										whileHover={{ scale: 1.15 }}
										whileTap={{ scale: 0.85 }}
										title={t("marketplace.widgets.everything.openFile")}
										onClick={(e) => openItem(item, e)}
										className="rounded-full p-1 text-text-faint hover:text-white transition-colors"
									>
										<ExternalLinkIcon size={12} />
									</motion.button>
								</div>
							</motion.div>
						);
					})
				)}
			</div>

			{/* Footer: Micro keyboard navigation tip */}
			<div className="flex items-center justify-between text-[10px] text-text-faint pt-0.5 border-t border-white/5">
				<span>{t("marketplace.widgets.everything.hint")}</span>
				<span className="font-mono">{t("marketplace.widgets.everything.totalCount", { n: totalResults })}</span>
			</div>
		</div>
	);
}
