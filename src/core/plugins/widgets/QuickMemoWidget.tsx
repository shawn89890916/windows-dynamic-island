import {
	CheckCircle2Icon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleIcon,
	PlusIcon,
	StickyNoteIcon,
} from "lucide-react";
import { useState } from "react";

interface MemoItem {
	id: string;
	text: string;
	done: boolean;
}

const STORAGE_KEY = "island_memo_items";

function loadMemos(): MemoItem[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return JSON.parse(raw);
	} catch {
		// fallback
	}
	return [
		{ id: "1", text: "给 Dynamic Island 插件提 PR", done: false },
		{ id: "2", text: "整理本周产品优化周报", done: true },
		{ id: "3", text: "下班买新鲜水果和牛奶", done: false },
	];
}

export function QuickMemoWidget({ settings: _settings }: { settings: Record<string, unknown> }) {
	const [memos, setMemos] = useState<MemoItem[]>(loadMemos);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isAdding, setIsAdding] = useState(false);
	const [newText, setNewText] = useState("");

	const saveMemos = (next: MemoItem[]) => {
		setMemos(next);
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {
			// ignore
		}
	};

	const safeIndex = memos.length > 0 ? Math.min(currentIndex, memos.length - 1) : 0;
	const currentMemo = memos[safeIndex];

	const toggleDone = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!currentMemo) return;
		const next = memos.map((m) => (m.id === currentMemo.id ? { ...m, done: !m.done } : m));
		saveMemos(next);
	};

	const handleAdd = (e: React.FormEvent | React.KeyboardEvent) => {
		e.preventDefault();
		if (!newText.trim()) {
			setIsAdding(false);
			return;
		}
		const newItem = { id: String(Date.now()), text: newText.trim(), done: false };
		const next = [newItem, ...memos];
		saveMemos(next);
		setNewText("");
		setCurrentIndex(0);
		setIsAdding(false);
	};

	const pendingCount = memos.filter((m) => !m.done).length;

	return (
		<div className="flex h-full items-center justify-between px-2 select-none">
			{/* Leading: Icon & Status */}
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex size-11 flex-none items-center justify-center rounded-2xl bg-amber-400/16 text-amber-300">
					<StickyNoteIcon size={20} />
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-1.5">
						<span className="text-[13px] font-semibold text-text">灵动速记</span>
						<span className="rounded-full bg-amber-400/15 px-1.5 py-0.2 text-[10px] font-medium text-amber-300">
							{pendingCount} 待办
						</span>
					</div>
					<span className="mt-0.5 text-[11px] text-text-faint">随时记录 · 一键归档</span>
				</div>
			</div>

			{/* Center: Featured Note Item with Checkbox */}
			<div className="flex min-w-0 flex-1 items-center justify-center px-4">
				{isAdding ? (
					<div className="flex w-full max-w-xs items-center gap-2">
						<input
							type="text"
							value={newText}
							onChange={(e) => setNewText(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAdd(e)}
							placeholder="输入便签内容后回车..."
							className="h-8 flex-1 rounded-full border border-white/12 bg-white/6 px-3.5 text-xs text-text placeholder:text-text-faint focus:border-white/30 focus:outline-none"
						/>
						<button
							type="button"
							onClick={handleAdd}
							className="h-8 rounded-full bg-amber-400 px-3 text-xs font-semibold text-neutral-900 active:scale-95"
						>
							保存
						</button>
					</div>
				) : currentMemo ? (
					<div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/6 px-3.5 py-2">
						<button
							type="button"
							onClick={toggleDone}
							className="text-text-faint hover:text-emerald-400 transition-colors"
						>
							{currentMemo.done ? (
								<CheckCircle2Icon size={18} className="text-emerald-400" />
							) : (
								<CircleIcon size={18} />
							)}
						</button>
						<span
							className={`max-w-[200px] truncate text-xs font-medium transition-all ${
								currentMemo.done ? "text-text-faint line-through opacity-60" : "text-text"
							}`}
						>
							{currentMemo.text}
						</span>
						{memos.length > 1 && (
							<div className="flex items-center gap-0.5 ml-2 border-l border-white/8 pl-2">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setCurrentIndex((prev) => (prev > 0 ? prev - 1 : memos.length - 1));
									}}
									className="rounded p-0.5 text-text-faint hover:text-text"
								>
									<ChevronLeftIcon size={13} />
								</button>
								<span className="font-mono text-[10px] text-text-faint tabular-nums">
									{safeIndex + 1}/{memos.length}
								</span>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setCurrentIndex((prev) => (prev < memos.length - 1 ? prev + 1 : 0));
									}}
									className="rounded p-0.5 text-text-faint hover:text-text"
								>
									<ChevronRightIcon size={13} />
								</button>
							</div>
						)}
					</div>
				) : (
					<div className="text-xs text-text-faint">暂无便签</div>
				)}
			</div>

			{/* Trailing: New Note Button */}
			<div className="flex flex-none items-center gap-2">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setIsAdding(!isAdding);
					}}
					className="flex h-8.5 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-text hover:bg-white/18 active:scale-95"
				>
					<PlusIcon size={13} />
					<span>新建</span>
				</button>
			</div>
		</div>
	);
}
