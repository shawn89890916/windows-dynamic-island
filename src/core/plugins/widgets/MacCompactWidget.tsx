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
			[data-island-surface] > div.ml-1 > div {
				padding-inline: 8px !important;
			}
			[data-island-surface] > div.ml-1 > div > :first-child {
				margin-right: 5px !important;
			}
			[data-island-surface] > div.ml-1 > div > :last-child {
				margin-left: 5px !important;
			}
			[data-hit]:has(> div > [data-mac-camera]) > button[data-hit] {
				top: 50% !important;
				left: calc(100% + 8px) !important;
				width: 34px !important;
				height: 34px !important;
				translate: 0 -50%;
			}
			[data-mac-camera] {
				width: var(--mac-camera-size) !important;
				height: var(--mac-camera-size) !important;
				border-color: #101114 !important;
				background: radial-gradient(circle at 38% 35%, #18191d 0%, #090a0d 42%, #020203 76%) !important;
				box-shadow: inset 0 0 0 1px rgb(255 255 255 / 4%), 0 1px 2px rgb(0 0 0 / 90%);
			}
			div:has(> [data-mac-camera]) {
				--mac-camera-size: clamp(10px, 0.92vw, 13px);
				margin-left: -2px !important;
			}
			div:has(> [data-mac-camera]) [data-capture] {
				width: clamp(5px, 0.42vw, 6px) !important;
				height: clamp(5px, 0.42vw, 6px) !important;
				left: calc(var(--mac-camera-size) + 3px) !important;
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
