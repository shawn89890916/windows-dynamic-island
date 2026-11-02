import { CheckIcon, ExternalLinkIcon, SendIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { SectionLabel } from "../../../../components/ui/text";
import { cn } from "../../../../core/cn";
import { useT } from "../../../../core/i18n";
import { useIsland } from "../../../../core/island";
import { useNow } from "../format";
import type { AgentDefinition, AgentSessionRef, AgentSnapshot } from "../types";
import { AgentCard } from "./AgentCard";
import { PermissionPrompt } from "./PermissionPrompt";
import { SessionList } from "./SessionList";
import { UsageChart } from "./UsageChart";

/** Expanded "AI Agents" dashboard. */
export function AgentsPanel({
	agents,
	snapshots,
	sessions,
}: {
	agents: AgentDefinition[];
	snapshots: AgentSnapshot[];
	sessions: AgentSessionRef[];
}) {
	const busy = sessions.some((s) => s.session.status === "working" || s.session.status === "waiting");
	const now = useNow(busy ? 1000 : 30_000);
	const t = useT();
	const island = useIsland();
	const asking = sessions.filter((s) => s.session.permission && s.agent.decide);
	// Picked tab, else the agent of the busiest session.
	const [picked, setPicked] = useState<string | null>(null);
	const [promptInput, setPromptInput] = useState("");
	const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

	useEffect(() => {
		return () => {
			island.keepOpen(false, "agents-prompt-input");
		};
	}, [island]);

	const index = Math.max(
		0,
		agents.findIndex((a) => a.id === (picked ?? sessions[0]?.agent.id)),
	);
	const agent = agents[index];
	const usage = snapshots[index]?.usage;

	const handleDispatchPrompt = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!promptInput.trim()) return;

		if (navigator.clipboard) {
			navigator.clipboard.writeText(promptInput.trim());
		}

		if (agent.launchApp) {
			agent.launchApp();
		} else if (sessions[0]?.session && agent.openSession) {
			agent.openSession(sessions[0].session);
		}

		setDispatchedSuccess(true);
		setPromptInput("");
		setTimeout(() => setDispatchedSuccess(false), 2400);
	};

	const agentSession = sessions.find((s) => s.agent.id === agent.id)?.session;
	const statusKey = agentSession?.status ?? "idle";
	const statusText =
		statusKey === "working"
			? t("agents.status.working")
			: statusKey === "waiting"
				? t("agents.status.waiting")
				: statusKey === "done"
					? t("agents.status.done")
					: "就绪";

	// Something to answer: just that, and the sessions.
	if (asking.length) {
		return (
			<div className="flex h-full flex-col gap-3">
				{/* biome-ignore lint/style/noNonNullAssertion: asking only holds sessions with a pending permission */}
				<PermissionPrompt key={asking[0].session.permission!.id} item={asking[0]} now={now} more={asking.length - 1} />
				<div className="flex min-h-0 flex-col gap-1.5">
					<SectionLabel>{t("agents.now")}</SectionLabel>
					<SessionList items={sessions} now={now} showAgent={agents.length > 1} />
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col gap-2.5">
			{/* Top Bar: Agents Tab List & Status/App Launch Action */}
			<div className="flex items-center justify-between gap-2">
				{agents.length > 1 && (
					<div className="flex gap-1.5" role="tablist">
						{agents.map((a) => (
							<button
								type="button"
								key={a.id}
								role="tab"
								aria-selected={a === agent}
								className={cn(
									"inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full bg-white/5 px-2.5 text-[12px] font-[650] text-text-faint transition-colors duration-150 hover:bg-white/9 hover:text-text-dim",
									a === agent &&
										"bg-[color-mix(in_srgb,var(--agent)_18%,transparent)] text-(--agent) hover:bg-[color-mix(in_srgb,var(--agent)_18%,transparent)] hover:text-(--agent)",
								)}
								style={{ "--agent": a.color } as React.CSSProperties}
								onClick={(e) => {
									e.stopPropagation();
									setPicked(a.id);
								}}
							>
								<a.Icon size={14} />
								{a.name}
							</button>
						))}
					</div>
				)}

				<div className="ml-auto flex items-center gap-2">
					<span className="flex items-center gap-1.5 rounded-full bg-white/6 px-2 py-0.5 text-[11px] font-medium text-text-dim">
						<span
							className={cn("size-1.5 rounded-full", statusKey === "working" && "animate-pulse")}
							style={{ background: agent.color }}
						/>
						{statusText}
					</span>
					{agent.launchApp && (
						<button
							type="button"
							className="flex h-6 cursor-pointer items-center gap-1 rounded-full bg-white/8 px-2 text-[11px] font-semibold text-text-dim hover:bg-white/14 hover:text-text transition-colors"
							onClick={(e) => {
								e.stopPropagation();
								agent.launchApp?.();
							}}
							title={t("agents.launchApp")}
						>
							<ExternalLinkIcon size={11} />
							<span>{t("agents.launchApp")}</span>
						</button>
					)}
				</div>
			</div>

			<AgentCard key={agent.id} agent={agent} snapshot={snapshots[index]} now={now} />

			{/* Universal AI Command & Prompt Dispatcher */}
			<form
				data-no-drag
				onSubmit={handleDispatchPrompt}
				className="flex items-center gap-2 rounded-[13px] bg-white/5 px-3 py-1.5 border border-white/8 focus-within:border-white/20 transition-colors"
				onClick={(e) => e.stopPropagation()}
			>
				<SparklesIcon size={14} className="flex-none" style={{ color: agent.color }} />
				<input
					type="text"
					value={promptInput}
					onChange={(e) => setPromptInput(e.target.value)}
					onFocus={() => island.keepOpen(true, "agents-prompt-input")}
					onBlur={() => island.keepOpen(false, "agents-prompt-input")}
					placeholder={t("agents.promptPlaceholder", { agent: agent.name })}
					className="w-full bg-transparent text-[12px] text-text placeholder:text-text-faint focus:outline-none"
				/>
				<button
					type="submit"
					disabled={!promptInput.trim()}
					className={cn(
						"flex h-6 cursor-pointer items-center gap-1 rounded-[8px] px-2.5 text-[11px] font-bold text-white transition-opacity",
						dispatchedSuccess ? "bg-[#30D158]" : "disabled:opacity-40 disabled:cursor-not-allowed",
					)}
					style={{ background: dispatchedSuccess ? "#30D158" : agent.color }}
				>
					{dispatchedSuccess ? (
						<>
							<CheckIcon size={11} />
							<span>{t("agents.dispatched", { agent: agent.name })}</span>
						</>
					) : (
						<>
							<SendIcon size={11} />
							<span>{t("agents.dispatchBtn")}</span>
						</>
					)}
				</button>
			</form>

			{usage?.daily.length ? <UsageChart usage={usage} color={agent.color} /> : null}

			<div className="flex min-h-0 flex-col gap-1.5">
				<SectionLabel>{t("agents.now")}</SectionLabel>
				<SessionList items={sessions} now={now} showAgent={agents.length > 1} />
			</div>
		</div>
	);
}
