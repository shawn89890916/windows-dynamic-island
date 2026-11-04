import { useEffect } from "react";
import { useT } from "../../i18n";
import { appearanceSettings, readSetting, setSetting, useSettings } from "../../settings";

const modes = ["none", "subtle", "moderate", "ambient"] as const;

export function DesktopGlassWidget() {
	const t = useT();
	const settings = useSettings();
	const selected = readSetting(settings, appearanceSettings.blurEffect);

	return (
		<div className="flex h-full flex-col justify-center gap-3 px-5 text-text">
			<div>
				<div className="text-sm font-semibold">{t("marketplace.widgets.desktopGlass.title")}</div>
				<div className="mt-1 text-xs text-text-dim">{t("marketplace.widgets.desktopGlass.desc")}</div>
			</div>
			<div className="flex flex-wrap gap-2">
				{modes.map((mode) => (
					<button
						key={mode}
						type="button"
						aria-pressed={selected === mode}
						className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${selected === mode ? "border-violet-400/70 bg-violet-400/15 text-white" : "border-white/10 bg-white/5 text-text-dim hover:bg-white/10"}`}
						onClick={() => setSetting(appearanceSettings.blurEffect, mode)}
					>
						{t(`appearance.blur.${mode}`)}
					</button>
				))}
			</div>
		</div>
	);
}

export function DesktopGlassBackground() {
	useEffect(() => () => setSetting(appearanceSettings.blurEffect, "none"), []);
	return null;
}
