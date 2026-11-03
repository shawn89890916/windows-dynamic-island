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
	usage?: { daily: { date: string; tokens: number; responses: number }[]; last5hTokens: number };
}

export const PROVIDER = "chatgpt";

export function useChatGpt(): AgentSnapshot {
	const state = useProvider<ChatGptState>(PROVIDER);
	const t = useT();

	if (!state?.available) return { available: false, sessions: [], limits: [] };

	const sessions = state.sessions ?? [];

	const limits: UsageLimit[] = [];
	if (state?.limits?.threeHour) {
		limits.push({
			id: "chatgpt-cap",
			label: "3h 消息上限",
			usedPct: state.limits.threeHour.usedPct,
			resetsAt: state.limits.threeHour.resetsAt,
		});
	}

	return {
		available: true,
		model: state?.model ?? "ChatGPT",
		tokensToday: state?.tokensToday,
		usage: state?.usage,
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
