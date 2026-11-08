import { useEffect } from "react";
import { useT } from "../../i18n";
import { pluginText } from "../registry";

export function MacCompactBackground() {
	useEffect(() => {
		const style = document.createElement("style");
		style.dataset.pluginStyle = "com.island.mac-compact";
		style.textContent = `
			[data-mac-compact-content] {
				left: 0 !important;
				margin-left: 0 !important;
				width: 100% !important;
			}
			[data-mac-compact-content] > div {
				display: flex !important;
				align-items: center !important;
				justify-content: space-between !important;
				gap: 4px !important;
				padding-inline: 8px !important;
			}
			[data-mac-compact-content] > div > :first-child {
				min-width: 0;
				max-width: 100%;
				overflow: hidden;
			}
			[data-mac-compact-content] > div > :last-child {
				min-width: 0;
				max-width: 100%;
				overflow: hidden;
			}
			[data-mac-compact-content] [data-activity-level-bar] {
				width: 64px !important;
			}
			[data-mac-privacy-indicator] [data-capture] {
				width: 6px !important;
				height: 6px !important;
			}
			[data-island-secondary-bubble] {
				top: calc(50% - 19px) !important;
			}
		`;
		document.head.append(style);
		return () => style.remove();
	}, []);
	return null;
}

export function MacCompactWidget() {
	const t = useT();
	return (
		<div className="flex h-full flex-col justify-center gap-2 px-5">
			<p className="text-sm font-semibold text-text">
				{pluginText(t, "marketplace.plugins.macCompact.name", "Mac Dynamic Island")}
			</p>
			<p className="text-xs text-text-dim">
				{pluginText(t, "marketplace.plugins.macCompact.desc", "Requires Island for Windows v0.5.23 or later.")}
			</p>
		</div>
	);
}
