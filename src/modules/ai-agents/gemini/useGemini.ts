import { useProvider } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import type { AgentSnapshot, AgentStatus, UsageLimit } from "../common/types";

export interface GeminiState {
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
		fiveHour?: { usedPct: number; resetsAt: number | null };
		sevenDay?: { usedPct: number; resetsAt: number | null };
	};
	model?: string;
	tokensToday?: { input: number; output: number; cacheRead: number; cacheWrite: number; messages: number };
	usage?: { daily: { date: string; tokens: number; responses: number }[]; last5hTokens: number };
}

export const PROVIDER = "gemini";

export function useGemini(): AgentSnapshot {
	const state = useProvider<GeminiState>(PROVIDER);
	const t = useT();

	const sessions = state?.sessions ?? [];

	const limits: UsageLimit[] = [];
	if (state?.limits?.fiveHour) {
		limits.push({
			id: "gemini-5h",
			label: t("agents.limit.fiveHour"),
			usedPct: state.limits.fiveHour.usedPct,
			resetsAt: state.limits.fiveHour.resetsAt,
		});
	}
	if (state?.limits?.sevenDay) {
		limits.push({
			id: "gemini-7d",
			label: t("agents.limit.sevenDay"),
			usedPct: state.limits.sevenDay.usedPct,
			resetsAt: state.limits.sevenDay.resetsAt,
		});
	}

	return {
		available: true,
		model: state?.model ?? "Gemini",
		tokensToday: state?.tokensToday,
		usage: state?.usage,
		limits,
		limitsHint: t("agents.noLimits"),
		sessions: sessions.map((s) => ({
			id: s.id,
			title: s.project,
			status: s.status,
			activity: s.activity?.arg ? `编辑 ${s.activity.arg}` : "运行中",
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
