import { useEffect } from "react";
import { useT } from "../../i18n";
import { pluginText } from "../registry";

export function MacCompactBackground() {
	useEffect(() => {
		const style = document.createElement("style");
		style.dataset.pluginStyle = "com.island.mac-compact";
		style.textContent = `
			[data-island-surface] > div.ml-1 {
				left: 0 !important;
				margin-left: 0 !important;
				width: 100% !important;
			}
			div:has(> [data-mac-camera]) {
				margin-left: -17px !important;
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
