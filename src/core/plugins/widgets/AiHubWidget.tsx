import {
	ActivityIcon,
	BotIcon,
	CheckCircle2Icon,
	Code2Icon,
	ExternalLinkIcon,
	FlameIcon,
	SendIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { command, openExternal } from "../../../core/bridge";
import { useIsland } from "../../../core/island";
import { ChatGptIcon } from "../../../modules/ai-agents/chatgpt/ChatGptIcon";
import { useChatGpt } from "../../../modules/ai-agents/chatgpt/useChatGpt";
import { ClaudeIcon } from "../../../modules/ai-agents/claude/ClaudeIcon";
import { useClaude } from "../../../modules/ai-agents/claude/useClaude";
import { CodexIcon } from "../../../modules/ai-agents/codex/CodexIcon";
import { useCodex } from "../../../modules/ai-agents/codex/useCodex";
import { formatTokens } from "../../../modules/ai-agents/common/format";
import type { AgentSnapshot } from "../../../modules/ai-agents/common/types";
import { GeminiIcon } from "../../../modules/ai-agents/gemini/GeminiIcon";
import { useGemini } from "../../../modules/ai-agents/gemini/useGemini";

export type AgentId = "gemini" | "claude" | "codex" | "chatgpt";

interface AgentDef {
	id: AgentId;
	name: string;
	brandColor: string;
	protocolUrl: string;
	webUrl: string;
}

const AGENT_CONFIGS: Record<AgentId, AgentDef> = {
	gemini: {
		id: "gemini",
		name: "Antigravity",
		brandColor: "#388BFD",
		protocolUrl: "antigravity://",
		webUrl: "https://aistudio.google.com",
	},
	claude: {
		id: "claude",
		name: "Claude Code",
		brandColor: "#D97757",
		protocolUrl: "claude://",
		webUrl: "https://claude.ai",
	},
	codex: {
		id: "codex",
		name: "OpenAI Codex",
		brandColor: "#8B9CFF",
		protocolUrl: "codex://",
		webUrl: "https://chatgpt.com/codex",
	},
	chatgpt: {
		id: "chatgpt",
		name: "ChatGPT",
		brandColor: "#10A37F",
		protocolUrl: "chatgpt://",
		webUrl: "https://chatgpt.com",
	},
};

export function AiHubWidget({ settings }: { settings: Record<string, unknown> }) {
	const island = useIsland();

	const initialAgent = (settings.defaultAgent as AgentId) || "claude";
	const [activeAgentId, setActiveAgentId] = useState<AgentId>(initialAgent);
	const [promptInput, setPromptInput] = useState("");
	const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);

	// Read REAL live snapshots from each agent provider
	const claudeSnap = useClaude();
	const codexSnap = useCodex();
	const geminiSnap = useGemini();
	const chatgptSnap = useChatGpt();

	const snapshots: Record<AgentId, AgentSnapshot> = {
		claude: claudeSnap,
		codex: codexSnap,
		gemini: geminiSnap,
		chatgpt: chatgptSnap,
	};

	useEffect(() => {
		return () => {
			island.keepOpen(false, "ai-hub");
		};
	}, [island]);

	const currentMeta = AGENT_CONFIGS[activeAgentId];
	const currentSnap = snapshots[activeAgentId];

	const isAvailable = currentSnap?.available ?? false;
	const activeSession = currentSnap?.sessions?.[0];
	const isWorking = activeSession?.status === "working";

	const activeTaskText = !isAvailable
		? "未检测到本地环境 / 尚未配置"
		: activeSession
			? activeSession.activity || activeSession.prompt || activeSession.title || "正在处理任务"
			: "就绪 · 暂无活跃会话";

	const tokensTotal = currentSnap?.tokensToday
		? currentSnap.tokensToday.input +
			currentSnap.tokensToday.output +
			currentSnap.tokensToday.cacheRead +
			currentSnap.tokensToday.cacheWrite
		: null;
	const tokensText = tokensTotal !== null ? formatTokens(tokensTotal) : "--";

	const limitPct = currentSnap?.limits?.[0]?.usedPct ?? null;

	const handleLaunchApp = (agent: AgentDef, e?: React.MouseEvent) => {
		e?.stopPropagation();
		openExternal(agent.protocolUrl);
	};

	const handleDispatchPrompt = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!promptInput.trim()) return;

		if (navigator.clipboard) {
			navigator.clipboard.writeText(promptInput.trim());
		}

		handleLaunchApp(currentMeta);

		setDispatchedSuccess(true);
		setPromptInput("");
		setTimeout(() => setDispatchedSuccess(false), 2400);
	};

	const renderAgentIcon = (id: AgentId, size = 15) => {
		switch (id) {
			case "gemini":
				return <GeminiIcon size={size} />;
			case "claude":
				return <ClaudeIcon size={size} />;
			case "codex":
				return <CodexIcon size={size} />;
			case "chatgpt":
				return <ChatGptIcon size={size} />;
		}
	};

	return (
		<div className="flex h-full flex-col justify-between select-none px-1 py-0.5">
			{/* Top Bar: Multi-Agent Switcher Tabs & Launch Action */}
			<div className="flex items-center justify-between border-b border-white/8 pb-1.5">
				<div className="flex items-center gap-1.5" role="tablist">
					{(Object.keys(AGENT_CONFIGS) as AgentId[]).map((agentKey) => {
						const a = AGENT_CONFIGS[agentKey];
						const snap = snapshots[agentKey];
						const isSelected = a.id === activeAgentId;
						const hasWork = snap?.sessions?.some((s) => s.status === "working");
						return (
							<button
								key={a.id}
								type="button"
								onClick={() => setActiveAgentId(a.id)}
								className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer border ${
									isSelected
										? "bg-white/12 border-white/25 shadow-sm text-white"
										: "bg-white/4 border-white/6 text-text-faint hover:text-text hover:bg-white/8"
								}`}
								style={{
									color: isSelected ? a.brandColor : undefined,
									borderColor: isSelected ? `${a.brandColor}55` : undefined,
								}}
							>
								{renderAgentIcon(a.id, 13)}
								<span>{a.name}</span>
								{hasWork && (
									<span className="size-1.5 rounded-full animate-pulse" style={{ backgroundColor: a.brandColor }} />
								)}
							</button>
						);
					})}
				</div>

				<button
					type="button"
					onClick={(e) => handleLaunchApp(currentMeta, e)}
					className="flex items-center gap-1 rounded-xl bg-white/6 border border-white/8 px-2.5 py-1 text-[11px] text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
				>
					<span className="text-[10.5px]">打开客户端</span>
					<ExternalLinkIcon size={11} />
				</button>
			</div>

			{/* Middle Row: Real Agent HUD Telemetry */}
			<div className="grid grid-cols-[1.6fr_1fr] gap-3 items-center py-1">
				{/* Left HUD: Active Task & Model */}
				<div className="flex flex-col justify-center gap-1 rounded-xl bg-white/4 border border-white/6 px-3 py-1.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
							<FlameIcon
								size={12}
								className="flex-none"
								style={{ color: isWorking ? currentMeta.brandColor : "#64748B" }}
							/>
							<span className="text-[11px] font-semibold text-text truncate">{activeTaskText}</span>
						</div>
						{currentSnap?.model && (
							<span
								className="rounded-md px-1.5 py-0.2 text-[9.5px] font-mono font-medium flex-none"
								style={{
									backgroundColor: `${currentMeta.brandColor}22`,
									color: currentMeta.brandColor,
								}}
							>
								{currentSnap.model}
							</span>
						)}
					</div>

					{/* Rate limit / Context meter */}
					<div className="flex items-center gap-2 pt-0.5">
						<div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
							<div
								className="h-full rounded-full transition-all duration-300"
								style={{
									width: limitPct !== null ? `${limitPct}%` : "0%",
									backgroundColor: currentMeta.brandColor,
								}}
							/>
						</div>
						<span className="font-mono text-[9.5px] text-text-faint tabular-nums shrink-0">
							{limitPct !== null ? `额度消耗: ${limitPct}%` : "暂无限额统计"}
						</span>
					</div>
				</div>

				{/* Right HUD: Tokens & Status Badges */}
				<div className="flex flex-col justify-center gap-1 rounded-xl bg-white/4 border border-white/6 px-3 py-1.5">
					<div className="flex items-center justify-between text-[10.5px]">
						<span className="text-text-faint flex items-center gap-1">
							<Code2Icon size={12} />
							今日消耗
						</span>
						<span className="font-mono text-text font-medium text-[11px] tabular-nums">{tokensText}</span>
					</div>
					<div className="flex items-center justify-between text-[10.5px]">
						<span className="text-text-faint flex items-center gap-1">
							<ActivityIcon size={12} />
							运行状态
						</span>
						<span
							className="font-medium text-[10.5px]"
							style={{ color: isWorking ? "#34D399" : isAvailable ? "#94A3B8" : "#E11D48" }}
						>
							{isWorking ? "工作执行中" : isAvailable ? "就绪" : "未连接"}
						</span>
					</div>
				</div>
			</div>

			{/* Bottom Row: Universal Prompt Dispatcher with Input Protection */}
			<form
				onSubmit={handleDispatchPrompt}
				className="flex items-center gap-2 rounded-xl bg-white/6 border border-white/8 focus-within:border-indigo-400/50 px-3 py-1 transition-colors"
				data-no-drag
			>
				<BotIcon size={14} style={{ color: currentMeta.brandColor }} className="shrink-0" />
				<input
					ref={inputRef}
					type="text"
					value={promptInput}
					onChange={(e) => setPromptInput(e.target.value)}
					onFocus={() => island.keepOpen(true, "ai-hub")}
					onBlur={() => island.keepOpen(false, "ai-hub")}
					onMouseDown={() => {
						island.keepOpen(true, "ai-hub");
						command("focus_island");
					}}
					placeholder={`向 ${currentMeta.name} 发送指令并唤起...`}
					className="flex-1 min-w-0 bg-transparent text-xs text-text placeholder:text-text-faint focus:outline-none"
				/>

				<AnimatePresence>
					{dispatchedSuccess && (
						<motion.span
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0 }}
							className="text-[10px] font-medium text-emerald-400 shrink-0 flex items-center gap-1"
						>
							<CheckCircle2Icon size={11} />
							<span>已唤起调度</span>
						</motion.span>
					)}
				</AnimatePresence>

				<button
					type="submit"
					disabled={!promptInput.trim()}
					className="flex items-center gap-1 rounded-lg px-2.5 py-0.8 text-[11px] font-medium text-white shadow disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
					style={{ backgroundColor: currentMeta.brandColor }}
				>
					<SendIcon size={11} />
					<span>调度</span>
				</button>
			</form>
		</div>
	);
}
