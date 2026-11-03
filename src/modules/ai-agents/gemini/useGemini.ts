import { useProvider } from "../../../core/bridge";
import type { AgentSnapshot, UsageLimit } from "../common/types";

export interface GeminiState {
	available?: boolean;
	connected?: boolean;
	error?: string;
	limits?: UsageLimit[];
}
export const PROVIDER = "gemini";

/** The backend only publishes verified quota data, never invented sessions/tokens. */
export function useGemini(): AgentSnapshot {
	const state = useProvider<GeminiState>(PROVIDER);
	return {
		available: state?.available === true,
		connection: state?.connected ? "connected" : "disconnected",
		model: state?.connected ? "本机服务已连接" : "未连接",
		limits: state?.connected ? (state.limits ?? []) : [],
		limitsHint: state?.error || "正在读取 Antigravity 本机服务…",
		metricsHint: "本机服务提供额度信息，未提供 Token 统计或会话状态。",
		sessions: [],
	};
}
