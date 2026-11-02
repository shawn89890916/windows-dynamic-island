import { CheckCircle2Icon, CircleIcon, PlusIcon, StickyNoteIcon, Trash2Icon } from "lucide-react";
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
		{ id: "1", text: "给 Dynamic Island 插件提 PR 并对标 Apple HIG 规范", done: false },
		{ id: "2", text: "整理本周产品优化周报与用户反馈建议", done: true },
		{ id: "3", text: "下班买新鲜水果、牛奶与咖啡豆", done: false },
	];
}

export function QuickMemoWidget({ settings: _settings }: { settings: Record<string, unknown> }) {
	const [memos, setMemos] = useState<MemoItem[]>(loadMemos);
	const [newText, setNewText] = useState("");

	const saveMemos = (next: MemoItem[]) => {
		setMemos(next);
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {
			// ignore
		}
	};

	const toggleDone = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		const next = memos.map((m) => (m.id === id ? { ...m, done: !m.done } : m));
		saveMemos(next);
	};

	const handleDelete = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		const next = memos.filter((m) => m.id !== id);
		saveMemos(next);
	};

	const handleAdd = (e: React.FormEvent | React.KeyboardEvent) => {
		e.preventDefault();
		if (!newText.trim()) return;
		const newItem = { id: String(Date.now()), text: newText.trim(), done: false };
		const next = [newItem, ...memos.slice(0, 2)];
		saveMemos(next);
		setNewText("");
	};

	const pendingCount = memos.filter((m) => !m.done).length;

	return (
		<div className="flex h-full flex-col justify-between px-2 py-1 select-none">
			{/* Top Bar: Title & Inline Add Input */}
			<div className="flex items-center justify-between border-b border-white/8 pb-2.5">
				<div className="flex items-center gap-2.5">
					<div className="flex size-9.5 items-center justify-center rounded-2xl bg-amber-400/18 text-amber-300">
						<StickyNoteIcon size={19} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-[13px] font-semibold text-text">灵动速记便签</span>
							<span className="rounded-full bg-amber-400/18 px-2 py-0.2 text-[10.5px] font-medium text-amber-300">
								{pendingCount} 待办
							</span>
						</div>
						<p className="text-[11px] text-text-faint">随时随地记录灵感 · 一键勾选归档</p>
					</div>
				</div>

				<form onSubmit={handleAdd} className="flex items-center gap-1.5">
					<input
						type="text"
						value={newText}
						onChange={(e) => setNewText(e.target.value)}
						placeholder="回车快速添加便签..."
						className="h-8 w-52 rounded-full border border-white/10 bg-white/6 px-3.5 text-xs text-text placeholder:text-text-faint focus:border-white/25 focus:outline-none"
					/>
					<button
						type="submit"
						disabled={!newText.trim()}
						className="flex size-8 items-center justify-center rounded-full bg-amber-400 text-neutral-900 transition-all hover:bg-amber-300 active:scale-95 disabled:opacity-40"
					>
						<PlusIcon size={14} />
					</button>
				</form>
			</div>

			{/* Parallel 3-Item Memo Checklist (Zero-Scroll Fixed Grid) */}
			<div className="flex flex-col gap-1.5 pt-2">
				{memos.slice(0, 3).map((item) => (
					<div
						key={item.id}
						className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/3 px-3 py-1.5 transition-all hover:border-white/12 hover:bg-white/6"
					>
						<div className="flex items-center gap-2.5 min-w-0">
							<button
								type="button"
								onClick={(e) => toggleDone(item.id, e)}
								className="text-text-faint hover:text-emerald-400 transition-colors flex-none"
							>
								{item.done ? <CheckCircle2Icon size={16} className="text-emerald-400" /> : <CircleIcon size={16} />}
							</button>
							<span
								className={`truncate text-xs font-medium transition-all ${
									item.done ? "text-text-faint line-through opacity-60" : "text-text"
								}`}
							>
								{item.text}
							</span>
						</div>

						<button
							type="button"
							title="删除"
							onClick={(e) => handleDelete(item.id, e)}
							className="rounded p-1 text-text-faint opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100 flex-none"
						>
							<Trash2Icon size={12} />
						</button>
					</div>
				))}
			</div>
		</div>
	);
}
