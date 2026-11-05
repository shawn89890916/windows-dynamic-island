import { useEffect, useState } from "react";
import { Row } from "../../components/ui/card";
import { useT } from "../../core/i18n";
import { type SettingDef, setSetting, useSetting } from "../../core/settings";
import { agentUsageAlertSettings } from "./settings";

export function AgentUsageAlertSettings() {
	const t = useT();
	return (
		<>
			<ThresholdRow def={agentUsageAlertSettings.fiveHour} />
			<ThresholdRow def={agentUsageAlertSettings.weekly} />
			<p className="px-1 pb-3.5 text-[12px]/[1.45] text-text-faint">{t("agents.alert.note")}</p>
		</>
	);
}

function ThresholdRow({ def }: { def: SettingDef<number> }) {
	const t = useT();
	const saved = useSetting(def);
	const [value, setValue] = useState(String(saved));

	useEffect(() => setValue(String(saved)), [saved]);

	const save = () => {
		const parsed = Number(value);
		const next = Number.isFinite(parsed) ? Math.min(100, Math.max(1, Math.round(parsed))) : saved;
		setValue(String(next));
		setSetting(def, next);
	};

	return (
		<Row label={t(def.label)} desc={def.description ? t(def.description) : undefined}>
			<label className="flex h-9 w-20 items-center gap-1.5 rounded-lg bg-white/6 px-2.5 shadow-[inset_0_0_0_1px_var(--hairline)] focus-within:shadow-[inset_0_0_0_1px_var(--text-faint)]">
				<input
					aria-label={t(def.label)}
					className="w-full bg-transparent text-right text-[13px] font-semibold tabular-nums text-text outline-none"
					type="number"
					min={1}
					max={100}
					step={5}
					value={value}
					onChange={(event) => setValue(event.target.value)}
					onBlur={save}
					onKeyDown={(event) => {
						if (event.key === "Enter") event.currentTarget.blur();
					}}
				/>
				<span className="text-[12px] text-text-faint">%</span>
			</label>
		</Row>
	);
}
