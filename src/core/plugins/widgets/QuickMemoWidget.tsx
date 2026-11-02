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
		{ id: "1", text: "下午 3 点整理周报", done: true },
		{ id: "2", text: "给 Dynamic Island 插件提 PR", done: false },
		{ id: "3", text: "下班买新鲜水果", done: false },
	];
}

export function QuickMemoWidget({ settings: _settings }: { settings: Record<string, unknown> }) {
	const [memos, setMemos] = useState<MemoItem[]>(loadMemos);
	const [input, setInput] = useState("");

	const saveMemos = (next: MemoItem[]) => {
		setMemos(next);
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {
			// ignore
		}
	};

	const handleAdd = () => {
		if (!input.trim()) return;
		const next = [{ id: String(Date.now()), text: input.trim(), done: false }, ...memos];
		saveMemos(next);
		setInput("");
	};

	const toggleDone = (id: string) => {
		const next = memos.map((m) => (m.id === id ? { ...m, done: !m.done } : m));
		saveMemos(next);
	};

	const handleDelete = (id: string) => {
		const next = memos.filter((m) => m.id !== id);
		saveMemos(next);
	};

	return (
		<div className="flex h-full flex-col justify-between p-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-white/8 pb-3">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
						<StickyNoteIcon size={16} />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-text">灵动速记便签</h3>
						<p className="text-[11px] text-text-faint">待办：{memos.filter((m) => !m.done).length} 项未完成</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleAdd()}
						placeholder="回车快速添加便签..."
						className="h-7 w-44 rounded-md border border-white/8 bg-white/4 px-2 text-xs text-text placeholder:text-text-faint focus:border-white/20 focus:outline-none"
					/>
					<button
						type="button"
						onClick={handleAdd}
						className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
					>
						<PlusIcon size={14} />
					</button>
				</div>
			</div>

			{/* Center memo list */}
			<div className="my-auto flex max-h-24 flex-col gap-1.5 overflow-y-auto pr-1">
				{memos.map((m) => (
					<div
						key={m.id}
						className="group flex items-center justify-between rounded-lg bg-white/2 px-2.5 py-1.5 text-xs transition-colors hover:bg-white/5"
					>
						<button
							type="button"
							onClick={() => toggleDone(m.id)}
							className="flex min-w-0 flex-1 items-center gap-2 text-left"
						>
							{m.done ? (
								<CheckCircle2Icon size={14} className="text-emerald-400" />
							) : (
								<CircleIcon size={14} className="text-text-faint" />
							)}
							<span className={`truncate ${m.done ? "text-text-faint line-through opacity-60" : "text-text"}`}>
								{m.text}
							</span>
						</button>
						<button
							type="button"
							onClick={() => handleDelete(m.id)}
							className="hidden text-text-faint hover:text-red-400 group-hover:block"
						>
							<Trash2Icon size={12} />
						</button>
					</div>
				))}

				{memos.length === 0 && (
					<div className="py-4 text-center text-xs text-text-faint">暂无待办便签，在上方输入框添加一条吧！</div>
				)}
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between border-t border-white/6 pt-2 text-[10px] text-text-faint">
				<span>实时本地保存 · 永不丢失</span>
				<span>点击圆圈标记完成</span>
			</div>
		</div>
	);
}
