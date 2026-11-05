import { AlertTriangleIcon } from "lucide-react";
import { useT } from "../../../../core/i18n";
import type { UsageAlert as UsageAlertData } from "../types";

export function UsageAlertCompact({ alert }: { alert: UsageAlertData }) {
	const t = useT();
	const window = t(alert.window === "5h" ? "agents.limit.fiveHour" : "agents.limit.sevenDay");
	return (
		<>
			<AlertTriangleIcon size={16} className="flex-none text-warn" />
			<span className="max-w-56 truncate text-[12.5px] font-semibold text-text">
				{t("agents.alert.compact", { agent: alert.agent.name, window })}
			</span>
			<span className="text-[12.5px] font-[650] text-warn tabular-nums">{Math.round(alert.usedPct)}%</span>
		</>
	);
}

export function UsageAlertBanner({ alert }: { alert: UsageAlertData }) {
	const t = useT();
	const window = t(alert.window === "5h" ? "agents.limit.fiveHour" : "agents.limit.sevenDay");
	return (
		<div className="flex items-center gap-2 rounded-lg bg-warn/10 px-3 py-2 text-[12px] text-warn shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--warn)_18%,transparent)]">
			<AlertTriangleIcon size={14} className="flex-none" />
			<span className="min-w-0 flex-1 truncate">{t("agents.alert.message", { agent: alert.agent.name, window })}</span>
			<span className="font-semibold tabular-nums">{Math.round(alert.usedPct)}%</span>
		</div>
	);
}
