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
import { command } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { useIsland } from "../../../core/island";
import { ChatGptIcon } from "../../../modules/ai-agents/chatgpt/ChatGptIcon";
import { ClaudeIcon } from "../../../modules/ai-agents/claude/ClaudeIcon";
import { CodexIcon } from "../../../modules/ai-agents/codex/CodexIcon";
import { GeminiIcon } from "../../../modules/ai-agents/gemini/GeminiIcon";

export type AgentId = "gemini" | "claude" | "codex" | "chatgpt";

interface AgentMeta {
	id: AgentId;
	name: string;
	brandColor: string;
	model: string;
	status: "working" | "idle" | "ready";
	activeTask: string;
	tokensToday: string;
	limitsUsed: number;
	protocolUrl: string;
	webUrl: string;
}

const AGENTS: Record<AgentId, AgentMeta> = {
	gemini: {
		id: "gemini",
		name: "Antigravity",
		brandColor: "#388BFD",
		model: "Gemini 3.8 / Pro",
		status: "working",
		activeTask: "AI智能中枢全栈调度与状态监控构建中",
		tokensToday: "142k / 58k",
		limitsUsed: 38,
		protocolUrl: "antigravity://",
		webUrl: "https://aistudio.google.com",
	},
	claude: {
		id: "claude",
		name: "Claude Code",
		brandColor: "#D97757",
		model: "Claude 3.7 Sonnet",
		status: "ready",
		activeTask: "HTTP Hooks 本地端点实时接入中",
		tokensToday: "210k / 84k",
		limitsUsed: 42,
		protocolUrl: "claude://",
		webUrl: "https://claude.ai",
	},
	codex: {
		id: "codex",
		name: "OpenAI Codex",
		brandColor: "#8B9CFF",
		model: "GPT-5 Codex",
		status: "working",
		activeTask: "代码沙箱环境与终端交互监控",
		tokensToday: "96k / 41k",
		limitsUsed: 22,
		protocolUrl: "codex://",
		webUrl: "https://chatgpt.com/codex",
	},
	chatgpt: {
		id: "chatgpt",
		name: "ChatGPT",
		brandColor: "#10A37F",
		model: "GPT-4o / o1",
		status: "idle",
		activeTask: "Windows 桌面应用在线等待提问",
		tokensToday: "85k / 32k",
		limitsUsed: 18,
		protocolUrl: "chatgpt://",
		webUrl: "https://chatgpt.com",
	},
};

export function AiHubWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const island = useIsland();

	const initialAgent = (settings.defaultAgent as AgentId) || "gemini";
	const [activeAgentId, setActiveAgentId] = useState<AgentId>(initialAgent);
	const [promptInput, setPromptInput] = useState("");
	const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);
	const currentAgent = AGENTS[activeAgentId];

	useEffect(() => {
		return () => {
			island.keepOpen(false, "ai-hub");
		};
	}, [island]);

	const handleLaunchApp = (agent: AgentMeta, e?: React.MouseEvent) => {
		e?.stopPropagation();
		// Try protocol URL then fallback to webUrl
		if (typeof window !== "undefined") {
			const a = document.createElement("a");
			a.href = agent.protocolUrl;
			a.target = "_blank";
			a.rel = "noopener noreferrer";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}
	};

	const handleDispatchPrompt = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!promptInput.trim()) return;

		// Copy prompt to clipboard
		if (navigator.clipboard) {
			navigator.clipboard.writeText(promptInput.trim());
		}

		// Launch the agent application
		handleLaunchApp(currentAgent);

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
				{/* 4 Agent Pills */}
				<div className="flex items-center gap-1.5" role="tablist">
					{(Object.keys(AGENTS) as AgentId[]).map((agentKey) => {
						const a = AGENTS[agentKey];
						const isSelected = a.id === activeAgentId;
						return (
							<motion.button
								key={a.id}
								type="button"
								whileHover={{ scale: 1.04 }}
								whileTap={{ scale: 0.96 }}
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
								{a.status === "working" && (
									<span className="size-1.5 rounded-full animate-pulse" style={{ backgroundColor: a.brandColor }} />
								)}
							</motion.button>
						);
					})}
				</div>

				{/* Quick Launch Button */}
				<motion.button
					type="button"
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={(e) => handleLaunchApp(currentAgent, e)}
					className="flex items-center gap-1 rounded-xl bg-white/6 border border-white/8 px-2.5 py-1 text-[11px] text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
				>
					<span className="text-[10.5px]">{t("marketplace.widgets.aiHub.launchApp")}</span>
					<ExternalLinkIcon size={11} />
				</motion.button>
			</div>

			{/* Middle Row: Live Agent HUD Telemetry */}
			<div className="grid grid-cols-[1.6fr_1fr] gap-3 items-center py-1">
				{/* Left HUD: Active Task & Model */}
				<div className="flex flex-col justify-center gap-1 rounded-xl bg-white/4 border border-white/6 px-3 py-1.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<FlameIcon size={12} style={{ color: currentAgent.brandColor }} />
							<span className="text-[11px] font-semibold text-text truncate">{currentAgent.activeTask}</span>
						</div>
						<span
							className="rounded-md px-1.5 py-0.2 text-[9.5px] font-mono font-medium"
							style={{
								backgroundColor: `${currentAgent.brandColor}22`,
								color: currentAgent.brandColor,
							}}
						>
							{currentAgent.model}
						</span>
					</div>

					{/* Rate limit / Context meter */}
					<div className="flex items-center gap-2 pt-0.5">
						<div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
							<motion.div
								initial={{ width: 0 }}
								animate={{ width: `${currentAgent.limitsUsed}%` }}
								transition={{ duration: 0.4 }}
								className="h-full rounded-full"
								style={{ backgroundColor: currentAgent.brandColor }}
							/>
						</div>
						<span className="font-mono text-[9.5px] text-text-faint tabular-nums shrink-0">
							{t("marketplace.widgets.aiHub.contextUsed")}: {currentAgent.limitsUsed}%
						</span>
					</div>
				</div>

				{/* Right HUD: Tokens & Status Badges */}
				<div className="flex flex-col justify-center gap-1 rounded-xl bg-white/4 border border-white/6 px-3 py-1.5">
					<div className="flex items-center justify-between text-[10.5px]">
						<span className="text-text-faint flex items-center gap-1">
							<Code2Icon size={12} />
							{t("marketplace.widgets.aiHub.tokensToday")}
						</span>
						<span className="font-mono text-text font-medium text-[11px] tabular-nums">{currentAgent.tokensToday}</span>
					</div>
					<div className="flex items-center justify-between text-[10.5px]">
						<span className="text-text-faint flex items-center gap-1">
							<ActivityIcon size={12} />
							{t("marketplace.widgets.aiHub.statusLabel")}
						</span>
						<span
							className="font-medium text-[10.5px]"
							style={{ color: currentAgent.status === "working" ? "#34D399" : "#94A3B8" }}
						>
							{currentAgent.status === "working"
								? t("marketplace.widgets.aiHub.statusWorking")
								: t("marketplace.widgets.aiHub.statusReady")}
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
				<BotIcon size={14} style={{ color: currentAgent.brandColor }} className="shrink-0" />
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
					placeholder={t("marketplace.widgets.aiHub.placeholderPrompt", {
						name: currentAgent.name,
					})}
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
							{t("marketplace.widgets.aiHub.dispatched")}
						</motion.span>
					)}
				</AnimatePresence>

				<motion.button
					type="submit"
					whileHover={{ scale: 1.08 }}
					whileTap={{ scale: 0.92 }}
					disabled={!promptInput.trim()}
					className="flex items-center gap-1 rounded-lg px-2.5 py-0.8 text-[11px] font-medium text-white shadow disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
					style={{ backgroundColor: currentAgent.brandColor }}
				>
					<SendIcon size={11} />
					<span>{t("marketplace.widgets.aiHub.btnSend")}</span>
				</motion.button>
			</form>
		</div>
	);
}
