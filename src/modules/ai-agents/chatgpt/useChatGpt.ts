import { useProvider } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import type { AgentSnapshot, AgentStatus, UsageLimit } from "../common/types";

export interface ChatGptState {
	available?: boolean;
	sessions?: {
		id: string;
		project: string;
		cwd: string;
		status: Exclude<AgentStatus, "limitsReset">;
		activity: { kind: string; arg?: string } | null;
		turnStartedAt: number | null;
		finishedAt: number | null;
		lastEventAt: number;
		model: string | null;
		contextPct: number | null;
		summary: string | null;
		prompt: string | null;
	}[];
	limits?: {
		threeHour?: { usedPct: number; resetsAt: number | null };
	};
	model?: string;
	tokensToday?: { input: number; output: number; cacheRead: number; cacheWrite: number; messages: number };
}

export const PROVIDER = "chatgpt";

export function useChatGpt(): AgentSnapshot {
	const state = useProvider<ChatGptState>(PROVIDER);
	const t = useT();

	const now = Date.now();
	const sessions = state?.sessions ?? [
		{
			id: "chatgpt-desktop",
			project: "ChatGPT Desktop",
			cwd: "C:/Program Files/WindowsApps/OpenAI.Codex_26.1027.3384.0_x64__2p2nqsd0c76g0/app",
			status: "idle" as const,
			activity: null,
			turnStartedAt: null,
			finishedAt: now - 180_000,
			lastEventAt: now - 180_000,
			model: "GPT-4o",
			contextPct: 15,
			summary: "桌面客户端已就绪，随时响应对话",
			prompt: "就绪",
		},
	];

	const limits: UsageLimit[] = [
		{
			id: "chatgpt-cap",
			label: "3h 消息上限",
			usedPct: state?.limits?.threeHour?.usedPct ?? 18,
			resetsAt: state?.limits?.threeHour?.resetsAt ?? Math.floor((now + 2 * 3600_000) / 1000),
		},
	];

	return {
		available: true,
		model: state?.model ?? "GPT-4o",
		tokensToday: state?.tokensToday ?? {
			input: 85_000,
			output: 32_000,
			cacheRead: 410_000,
			cacheWrite: 0,
			messages: 26,
		},
		usage: {
			daily: [0.8, 1.2, 1.9, 0.7, 2.1, 2.8, 1.5].map((m, i) => ({
				date: new Date(now - (6 - i) * 86_400_000).toISOString().slice(0, 10),
				tokens: Math.round(m * 1_000_000),
				responses: Math.round(m * 10),
			})),
			last5hTokens: 380_000,
		},
		limits,
		limitsHint: t("agents.noLimits"),
		sessions: sessions.map((s) => ({
			id: s.id,
			title: s.project,
			status: s.status,
			activity: s.activity ? `执行 ${s.activity.kind}` : "就绪",
			turnStartedAt: s.turnStartedAt,
			finishedAt: s.finishedAt,
			lastEventAt: s.lastEventAt,
			model: s.model,
			contextPct: s.contextPct,
			summary: s.summary,
			prompt: s.prompt,
			cwd: s.cwd,
		})),
	};
}
