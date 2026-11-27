import { Activity, Download, Music2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Card, Row } from "../../components/ui/card";
import { NumberField, Select } from "../../components/ui/form";
import { command, isTauri } from "../../core/bridge";
import { type LanguagePref, languageSetting, locales, systemLocale, useT } from "../../core/i18n";
import { macAppearanceEnabled } from "../../core/plugins/appearancePlugin";
import { useInstalledPlugins } from "../../core/plugins/registry";
import {
	appearanceSettings,
	generalSettings,
	mainTaskCountSetting,
	monitorSettings,
	type NumberSettingDef,
	positionSettings,
	readHorizontalOffset,
	readNumberSetting,
	readSetting,
	setSetting,
	sizeSettings,
	taskCountSetting,
	topMarginSetting,
} from "../../core/settings";
import { Title } from "../components/Heading";
import { Toggle, ToggleRow } from "../components/Toggle";

export function GeneralPage({ values }: { values: Record<string, unknown> }) {
	const t = useT();
	const plugins = useInstalledPlugins();
	const style = macAppearanceEnabled(plugins) ? "windows" : readSetting(values, appearanceSettings.style);
	const topMargin = topMarginSetting(style);
	return (
		<>
			<Title>{t("settings.general")}</Title>
			<Card>
				<LanguageRow value={readSetting(values, languageSetting)} />
				<AutostartRow />
				<Row as="label" label={t(taskCountSetting.label)} desc={t(taskCountSetting.description)}>
					<Select
						value={readNumberSetting(values, taskCountSetting)}
						onChange={(event) => setSetting(taskCountSetting, Number(event.target.value))}
					>
						{Array.from({ length: taskCountSetting.max - taskCountSetting.min + 1 }, (_, index) => {
							const count = taskCountSetting.min + index;
							return (
								<option key={count} value={count}>
									{count}
								</option>
							);
						})}
					</Select>
				</Row>
				<TaskArrangementSetting value={readNumberSetting(values, mainTaskCountSetting)} />
				{Object.values(generalSettings).map((def) => (
					<ToggleRow key={def.key} def={def} value={readSetting(values, def)} />
				))}
			</Card>
			<Card>
				<MonitorRow value={readSetting(values, monitorSettings.monitor)} />
				<ToggleRow def={monitorSettings.avoidMaximized} value={readSetting(values, monitorSettings.avoidMaximized)} />
			</Card>
			<Card>
				<NumberSettingRow def={sizeSettings.width} value={readNumberSetting(values, sizeSettings.width)} unit="%" />
				<NumberSettingRow def={sizeSettings.height} value={readNumberSetting(values, sizeSettings.height)} unit="%" />
				<NumberSettingRow def={positionSettings.horizontalOffset} value={readHorizontalOffset(values)} unit="px" />
				<TopMarginRow def={topMargin} value={readNumberSetting(values, topMargin)} />
				<ToggleRow def={positionSettings.returnToCenter} value={readSetting(values, positionSettings.returnToCenter)} />
				<NumberSettingRow
					def={positionSettings.returnDelay}
					value={readNumberSetting(values, positionSettings.returnDelay)}
					unit="s"
					disabled={!readSetting(values, positionSettings.returnToCenter)}
				/>
			</Card>
		</>
	);
}

function TaskArrangementSetting({ value }: { value: number }) {
	const t = useT();
	const [preview, setPreview] = useState<{ revision: number; mainCount: number; separated: boolean } | null>(null);
	const revision = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);

	const change = (next: number) => {
		if (next === value) return;
		setSetting(mainTaskCountSetting, next);
		revision.current += 1;
		setPreview({ revision: revision.current, mainCount: next === 3 ? 1 : next, separated: next === 3 });
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => setPreview(null), 1600);
	};

	const icons = [
		{ key: "activity", Icon: Activity },
		{ key: "music", Icon: Music2 },
		{ key: "download", Icon: Download },
	];
	return (
		<>
			<Row label={t(mainTaskCountSetting.label)} desc={t(mainTaskCountSetting.description)}>
				<Select value={value} onChange={(event) => change(Number(event.target.value))}>
					<option value={1}>{t("settings.mainTaskCount.optionSingle")}</option>
					<option value={2}>{t("settings.mainTaskCount.optionPair")}</option>
					<option value={3}>{t("settings.mainTaskCount.optionSeparated")}</option>
				</Select>
			</Row>
			<AnimatePresence mode="wait">
				{preview && (
					<motion.div
						key={preview.revision}
						aria-hidden="true"
						className="overflow-hidden"
						initial={{ opacity: 0, height: 0, y: -4 }}
						animate={{ opacity: 1, height: 48, y: 0 }}
						exit={{ opacity: 0, height: 0, y: -4 }}
						transition={{ duration: 0.2 }}
					>
						<div className="flex h-12 items-center justify-center gap-2">
							<motion.div
								layout
								className="flex h-8 items-center justify-center gap-2 rounded-full bg-black px-3 shadow-[0_5px_14px_-8px_rgba(0,0,0,0.8)]"
								transition={{ type: "spring", stiffness: 420, damping: 28 }}
							>
								{icons.slice(0, preview.mainCount).map(({ key, Icon }, index) => (
									<span key={key} className="flex items-center gap-2">
										{index > 0 && <span className="h-4 w-px bg-white/20" />}
										<Icon size={15} strokeWidth={2.1} className="text-white" />
									</span>
								))}
							</motion.div>
							<div className="flex items-center gap-2">
								{icons.slice(preview.mainCount).map(({ key, Icon }, index) => (
									<motion.div
										key={key}
										initial={{ opacity: 0, scale: 0.45, x: -8 }}
										animate={{ opacity: 1, scale: 1, x: 0 }}
										exit={{ opacity: 0, scale: 0.45, x: -8 }}
										transition={{ type: "spring", stiffness: 420, damping: 26, delay: index * 0.06 }}
										className={
											preview.separated
												? "flex h-8 min-w-20 items-center gap-1.5 rounded-full bg-black px-2.5 shadow-[0_5px_14px_-8px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
												: "grid size-8 place-items-center rounded-full bg-black shadow-[0_5px_14px_-8px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
										}
									>
										<Icon size={14} strokeWidth={2.1} className="shrink-0 text-white" />
										{preview.separated && <span className="text-[10px] text-white/75">{key}</span>}
									</motion.div>
								))}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}

function LanguageRow({ value }: { value: LanguagePref }) {
	const t = useT();
	const system = locales[systemLocale()].name;
	return (
		<Row as="label" label={t("settings.language.label")} desc={t("settings.language.desc")}>
			<Select value={value} onChange={(e) => setSetting(languageSetting, e.target.value as LanguagePref)}>
				<option value="auto">{t("settings.language.auto", { language: system })}</option>
				{Object.entries(locales).map(([code, { name }]) => (
					<option key={code} value={code}>
						{name}
					</option>
				))}
			</Select>
		</Row>
	);
}

interface MonitorInfo {
	id: string;
	name: string | null;
	width: number;
	height: number;
	primary: boolean;
}

/** Monitors come from the backend; re-read when the window gets focus (plugged in meanwhile). */
function useMonitors() {
	const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
	useEffect(() => {
		const load = () => command<MonitorInfo[]>("list_monitors").then((list) => setMonitors(list ?? []));
		load();
		window.addEventListener("focus", load);
		return () => window.removeEventListener("focus", load);
	}, []);
	return monitors;
}

function MonitorRow({ value }: { value: string }) {
	const t = useT();
	const def = monitorSettings.monitor;
	const monitors = useMonitors();
	const nameOf = (m: MonitorInfo) => m.name || t("settings.monitor.generic", { n: monitors.indexOf(m) + 1 });
	const primary = monitors.find((m) => m.primary);
	const missing = value !== "primary" && monitors.length > 0 && !monitors.some((m) => m.id === value);

	return (
		<Row as="label" label={t(def.label)} desc={def.description && t(def.description)}>
			<Select value={value} onChange={(e) => setSetting(def, e.target.value)}>
				<option value="primary">
					{primary ? t("settings.monitor.auto", { name: nameOf(primary) }) : t("settings.monitor.auto", { name: "—" })}
				</option>
				{monitors.map((m) => (
					<option key={m.id} value={m.id}>
						{`${nameOf(m)} · ${m.width}×${m.height}${m.primary ? ` (${t("settings.monitor.primary")})` : ""}`}
					</option>
				))}
				{missing && <option value={value}>{t("settings.monitor.missing")}</option>}
			</Select>
		</Row>
	);
}

function AutostartRow() {
	const t = useT();
	const [on, setOn] = useState<boolean | null>(null);
	// Store edition: turned off in Task Manager, which only lets it back on there.
	const [blocked, setBlocked] = useState(false);
	useEffect(() => {
		command<boolean>("get_autostart").then((v) => setOn(!!v));
	}, []);

	const desc = !isTauri ? t("settings.autostart.appOnly") : blocked && t("settings.autostart.disabledByUser");
	return (
		<Row as="label" label={t("settings.autostart.label")} desc={desc}>
			<Toggle
				checked={!!on}
				disabled={on === null}
				onChange={async (v) => {
					setOn(v);
					try {
						const result = await command<boolean>("set_autostart", { enabled: v });
						if (typeof result === "boolean") setOn(result);
						setBlocked(false);
					} catch (e) {
						setOn(false);
						setBlocked(e === "disabledByUser");
					}
				}}
			/>
		</Row>
	);
}

function NumberSettingRow({
	def,
	value,
	unit,
	disabled,
}: {
	def: NumberSettingDef;
	value: number;
	unit: string;
	disabled?: boolean;
}) {
	const t = useT();
	const [draft, setDraft] = useState(String(value));
	useEffect(() => setDraft(String(value)), [value]);
	const commit = () => {
		const n = Number.parseFloat(draft);
		if (!Number.isFinite(n) || n < def.min || n > def.max) {
			setDraft(String(value));
			return;
		}
		const step = def.step ?? 1;
		const next = Number((Math.round(n / step) * step).toFixed(2));
		setDraft(String(next));
		if (next !== value) setSetting(def, next);
	};

	return (
		<Row as="label" label={t(def.label)} desc={def.description && t(def.description)} disabled={disabled}>
			<NumberField
				unit={unit}
				min={def.min}
				max={def.max}
				step={def.step ?? 1}
				value={draft}
				disabled={disabled}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
			/>
		</Row>
	);
}

function TopMarginRow({ def, value }: { def: ReturnType<typeof topMarginSetting>; value: number }) {
	const t = useT();
	const [draft, setDraft] = useState(String(value));
	useEffect(() => setDraft(String(value)), [value]);
	const commit = (num?: number) => {
		const n = num ?? Math.round(Number.parseFloat(draft));
		if (Number.isFinite(n) && n >= def.min && n <= def.max) {
			setSetting(def, n);
			setDraft(String(n));
		} else {
			setDraft(String(value));
		}
	};

	return (
		<Row as="label" label={t(def.label)} desc={t(def.description)}>
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => commit(0)}
						className={`rounded-md px-2 py-1 text-xs transition-colors cursor-pointer ${
							value === 0
								? "bg-white/16 text-white font-medium"
								: "bg-white/6 text-text-faint hover:bg-white/10 hover:text-text"
						}`}
					>
						0px 贴顶
					</button>
					<button
						type="button"
						onClick={() => commit(48)}
						className={`rounded-md px-2 py-1 text-xs transition-colors cursor-pointer ${
							value === 48
								? "bg-accent text-white font-semibold shadow-xs"
								: "bg-white/6 text-text-faint hover:bg-white/10 hover:text-text"
						}`}
						title="适合 Windows 顶部任务栏"
					>
						48px 避让任务栏
					</button>
				</div>
				<NumberField
					unit="px"
					min={def.min}
					max={def.max}
					step={def.step}
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={() => commit()}
					onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
				/>
			</div>
		</Row>
	);
}
