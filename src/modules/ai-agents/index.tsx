import { SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
/**
 * AI Agents module — shows what coding agents are doing.
 *
 * Layout:
 *   common/   agent-agnostic types, formatting and UI (cards, session list…)
 *   claude/   Claude Code integration (one `AgentDefinition`)
 *   codex/    OpenAI Codex integration
 *
 * To support another agent, add a folder exporting an `AgentDefinition` and
 * append it to `agents` below.
 */
import { macAppearanceEnabled } from "../../core/plugins/appearancePlugin";
import { useInstalledPlugins } from "../../core/plugins/registry";
import { useSetting } from "../../core/settings";
import type { IslandModule, ModuleView } from "../../core/types";
import { AgentUsageAlertSettings } from "./AgentUsageAlertSettings";
import { claudeAgent } from "./claude";
import { codexAgent } from "./codex";
import { AgentCompactLeft, AgentCompactRight } from "./common/components/AgentCompact";
import { AgentsPanel } from "./common/components/AgentsPanel";
import { StatusGlyph } from "./common/components/StatusGlyph";
import { UsageAlertCompact } from "./common/components/UsageAlert";
import { useNow } from "./common/format";
import { pickPrimary } from "./common/primary";
import type { AgentDefinition, AgentSessionRef, AgentStatus, UsageAlert } from "./common/types";
import { geminiAgent } from "./gemini";
import { agentSettings, agentUsageAlertSettings } from "./settings";

const agents: AgentDefinition[] = [claudeAgent, codexAgent, geminiAgent];

/** How long a finished turn keeps the island's attention. */
const DONE_VISIBLE_MS = 8_000;
const SESSION_GAP_GRACE_MS = 2_500;
const RECENT_MS = 30 * 60_000;
/** Height of the 7-day usage row. */
const USAGE_CHART = 74;
/** The permission request card plus the "Now" heading. */
const PERMISSION_PROMPT = 196;
/** The agent tabs, when more than one agent is installed. */
const AGENT_TABS = 34;

const RANK: Record<AgentStatus, number> = { waiting: 0, limitsReset: 1, working: 2, done: 3, idle: 4 };
const PRIORITY: Record<AgentStatus, number> = { waiting: 90, limitsReset: 80, done: 70, working: 60, idle: 0 };

export const aiAgentsModule: IslandModule = {
	id: "ai-agents",
	title: "agents.title",
	settingsIcon: <SparklesIcon size={15} />,
	settings: Object.values(agentSettings),
	SettingsSection: () => (
		<>
			<AgentUsageAlertSettings />
			{agents.map((a) => a.SettingsSection && <a.SettingsSection key={a.id} />)}
		</>
	),
	useView(): ModuleView {
		const macCompact = macAppearanceEnabled(useInstalledPlugins());
		const peekOnWaiting = useSetting(agentSettings.peekOnWaiting);
		const peekOnDone = useSetting(agentSettings.peekOnDone);
		const peekOnLimitsReset = useSetting(agentSettings.peekOnLimitsReset);
		const fiveHourThreshold = useSetting(agentUsageAlertSettings.fiveHour);
		const weeklyThreshold = useSetting(agentUsageAlertSettings.weekly);
		const seenAboveThreshold = useRef(new Map<string, boolean>());
		const [usageAlert, setUsageAlert] = useState<UsageAlert | null>(null);
		const peekOn: Partial<Record<AgentStatus, boolean>> = {
			waiting: peekOnWaiting,
			done: peekOnDone,
			limitsReset: peekOnLimitsReset,
		};

		// Static list → stable hook order.
		// biome-ignore lint/correctness/useHookAtTopLevel: the agent list is static, so the hook order is stable
		const all = agents.map((a) => a.useAgent());
		// Agents not on this computer stay out of sight (Claude is always shown).
		const shown = agents.flatMap((agent, i) => (i === 0 || all[i].available ? [{ agent, snapshot: all[i] }] : []));
		const visible = shown.map((s) => s.agent);
		const snapshots = shown.map((s) => s.snapshot);

		useEffect(() => {
			for (let i = 0; i < visible.length; i++) {
				for (const limit of snapshots[i].limits) {
					const window = usageWindow(limit);
					if (!window) continue;
					const threshold = window === "5h" ? fiveHourThreshold : weeklyThreshold;
					const key = `${visible[i].id}:${window}`;
					const above = limit.usedPct >= threshold;
					const wasAbove = seenAboveThreshold.current.get(key);
					seenAboveThreshold.current.set(key, above);
					if (wasAbove === false && above) {
						setUsageAlert({ id: `${key}:${Date.now()}`, agent: visible[i], window, usedPct: limit.usedPct });
					}
				}
			}
		}, [snapshots, visible, fiveHourThreshold, weeklyThreshold]);

		useEffect(() => {
			if (!usageAlert) return;
			const timer = window.setTimeout(() => setUsageAlert(null), 3800);
			return () => window.clearTimeout(timer);
		}, [usageAlert]);

		const sessions: AgentSessionRef[] = visible
			.flatMap((agent, i) => snapshots[i].sessions.map((session) => ({ agent, session })))
			.sort((a, b) => RANK[a.session.status] - RANK[b.session.status] || b.session.lastEventAt - a.session.lastEventAt);

		const hasDone = sessions.some((s) => s.session.status === "done");
		const now = useNow(1000, hasDone);

		const isHot = ({ session: s }: AgentSessionRef) =>
			s.status === "working" ||
			s.status === "waiting" ||
			// Only present while fresh — the agent drops it.
			s.status === "limitsReset" ||
			(s.status === "done" && now - (s.finishedAt ?? 0) < DONE_VISIBLE_MS);

		const hot = useStickyHot(sessions.find(isHot));
		const busyCount = sessions.filter((s) => s.session.status === "working" || s.session.status === "waiting").length;
		const recent = sessions
			.filter((s) => s.session.status !== "idle" || now - s.session.lastEventAt < RECENT_MS)
			.slice(0, 4);

		const primary = pickPrimary(visible, snapshots);
		const asking = sessions.some((s) => s.session.permission && s.agent.decide);

		return {
			active: !!hot || !!usageAlert,
			priority: usageAlert ? 85 : hot ? PRIORITY[hot.session.status] : 0,
			// A permission to answer: opening the island goes straight to it.
			attention: asking,
			icon: <StatusGlyph agent={hot?.agent ?? primary} status={hot?.session.status ?? "idle"} size={18} />,
			compact: usageAlert
				? { left: <UsageAlertCompact alert={usageAlert} />, right: null, width: 340 }
				: hot && {
						left: <AgentCompactLeft hot={hot} busyCount={busyCount} macCompact={macCompact} />,
						right: <AgentCompactRight hot={hot} />,
						width: 340,
					},
			expanded: <AgentsPanel agents={visible} snapshots={snapshots} sessions={recent} usageAlert={usageAlert} />,
			expandedSize: asking
				? { width: 620, height: PERMISSION_PROMPT + Math.max(1, recent.length) * 30 }
				: {
						width: 620,
						height:
							274 +
							Math.max(1, recent.length) * 30 +
							(snapshots.some((s) => s.usage?.daily.length) ? USAGE_CHART : 0) +
							(visible.length > 1 ? AGENT_TABS : 0),
					},
			// Peek when an agent needs you, just finished or its limits reset (each is a setting).
			activityKey:
				usageAlert?.id ??
				(hot && peekOn[hot.session.status]
					? `${hot.agent.id}:${hot.session.id}:${hot.session.status}:${hot.session.finishedAt ?? hot.session.lastEventAt}`
					: undefined),
		};
	},
};

/** Brief provider gaps during a Codex rollout rewrite should not hide the island. */
function useStickyHot(hot?: AgentSessionRef) {
	const lastHot = useRef<AgentSessionRef | undefined>(hot);
	const [retaining, setRetaining] = useState(Boolean(hot));
	const hasHot = Boolean(hot);
	if (hot) lastHot.current = hot;

	useEffect(() => {
		if (hasHot) {
			setRetaining(true);
			return;
		}
		const timer = window.setTimeout(() => {
			lastHot.current = undefined;
			setRetaining(false);
		}, SESSION_GAP_GRACE_MS);
		return () => window.clearTimeout(timer);
	}, [hasHot]);

	return hot ?? (retaining ? lastHot.current : undefined);
}

function usageWindow(limit: { id: string; label: string; windowMinutes?: number | null }): UsageAlert["window"] | null {
	const value = `${limit.id} ${limit.label}`.toLowerCase();
	if (limit.windowMinutes === 300 || limit.id === "5h" || /(^|[-_ ])5h\b|five.?hour/.test(value)) return "5h";
	if (limit.windowMinutes === 10_080 || limit.id === "7d" || /weekly|seven.?day|7d\b/.test(value)) return "weekly";
	return null;
}
