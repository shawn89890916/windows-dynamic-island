import { CheckIcon, ExternalLinkIcon, SlidersIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { command } from "../../../core/bridge";
import { updatePluginSettings } from "../registry";
import type { PluginSettingField } from "../types";

export function NeedsConfigCard({
	pluginId,
	title,
	description,
	icon,
	accentColor = "#6366F1",
	settingsDefs,
	currentSettings,
	externalUrl,
	externalLabel,
	onConfigured,
}: {
	pluginId: string;
	title: string;
	description: string;
	icon: ReactNode;
	accentColor?: string;
	settingsDefs?: PluginSettingField[];
	currentSettings?: Record<string, unknown>;
	externalUrl?: string;
	externalLabel?: string;
	onConfigured?: (settings: Record<string, unknown>) => void;
}) {
	const [formValues, setFormValues] = useState<Record<string, unknown>>(() => ({
		...currentSettings,
	}));
	const [savedSuccess, setSavedSuccess] = useState(false);

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		const updated = { ...formValues, configured: true };
		updatePluginSettings(pluginId, updated);
		setSavedSuccess(true);
		onConfigured?.(updated);
		setTimeout(() => setSavedSuccess(false), 2000);
	};

	return (
		<div className="flex h-full flex-col justify-center px-4 py-3 select-none" onClick={(e) => e.stopPropagation()}>
			<div className="flex items-center justify-between border-b border-white/8 pb-2">
				<div className="flex items-center gap-2.5">
					<div
						className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/6"
						style={{ color: accentColor }}
					>
						{icon}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-[13px] font-semibold text-text">{title}</span>
							<span className="rounded-full bg-amber-500/18 px-2 py-0.2 text-[10px] font-medium text-amber-300">
								尚未配置
							</span>
						</div>
						<p className="text-[11.5px] text-text-faint">{description}</p>
					</div>
				</div>

				{externalUrl && (
					<button
						type="button"
						onClick={() => command("open_external", { url: externalUrl })}
						className="flex items-center gap-1 text-[11px] font-medium text-text-dim hover:text-text bg-white/6 hover:bg-white/10 px-2.5 py-1 rounded-lg transition-colors"
					>
						<span>{externalLabel || "官方说明"}</span>
						<ExternalLinkIcon size={11} />
					</button>
				)}
			</div>

			{settingsDefs && settingsDefs.length > 0 ? (
				<form onSubmit={handleSave} className="mt-2.5 flex flex-col gap-2" data-no-drag>
					<div className="grid grid-cols-2 gap-2 max-h-[85px] overflow-y-auto pr-1">
						{settingsDefs.map((def) => (
							<div key={def.key} className="flex flex-col gap-1">
								<span className="text-[11px] font-medium text-text-dim truncate" title={def.label}>
									{def.label}
								</span>
								{def.type === "select" ? (
									<select
										value={String(formValues[def.key] ?? def.default ?? "")}
										onChange={(e) => setFormValues((prev) => ({ ...prev, [def.key]: e.target.value }))}
										className="h-7 rounded-lg border border-white/10 bg-white/6 px-2 text-[11.5px] text-text focus:border-white/30 focus:outline-none"
									>
										{def.options?.map((opt: { label: string; value: string | number | boolean }) => (
											<option key={String(opt.value)} value={String(opt.value)} className="bg-[#18181f]">
												{opt.label}
											</option>
										))}
									</select>
								) : def.type === "boolean" ? (
									<label className="flex h-7 items-center gap-2 cursor-pointer text-[11.5px] text-text">
										<input
											type="checkbox"
											checked={Boolean(formValues[def.key] ?? def.default ?? false)}
											onChange={(e) => setFormValues((prev) => ({ ...prev, [def.key]: e.target.checked }))}
											className="rounded border-white/20 bg-white/10 accent-indigo-500"
										/>
										<span>启用</span>
									</label>
								) : (
									<input
										type={def.type === "password" ? "password" : "text"}
										value={String(formValues[def.key] ?? def.default ?? "")}
										onChange={(e) => setFormValues((prev) => ({ ...prev, [def.key]: e.target.value }))}
										onMouseDown={() => command("focus_island")}
										onFocus={() => command("focus_island")}
										placeholder={`请输入 ${def.label}`}
										className="h-7 rounded-lg border border-white/10 bg-white/6 px-2.5 text-[11.5px] text-text placeholder:text-text-faint focus:border-white/30 focus:outline-none"
									/>
								)}
							</div>
						))}
					</div>

					<div className="mt-1 flex items-center justify-end gap-2">
						<button
							type="submit"
							className="flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-semibold text-white shadow-sm transition-transform active:scale-95"
							style={{ background: savedSuccess ? "#10B981" : accentColor }}
						>
							{savedSuccess ? (
								<>
									<CheckIcon size={12} />
									<span>已保存并连接</span>
								</>
							) : (
								<>
									<SlidersIcon size={12} />
									<span>保存配置并连接</span>
								</>
							)}
						</button>
					</div>
				</form>
			) : (
				<div className="mt-3 flex items-center justify-center">
					<span className="text-xs text-text-faint">请在设置中心“插件市场 → 已安装”中配置此插件。</span>
				</div>
			)}
		</div>
	);
}
