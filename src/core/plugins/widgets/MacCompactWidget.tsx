import { useT } from "../../i18n";
import { pluginText } from "../registry";

export function MacCompactWidget() {
	const t = useT();
	return (
		<div className="flex h-full flex-col justify-center gap-2 px-5">
			<p className="text-sm font-semibold text-text">
				{pluginText(t, "marketplace.plugins.macCompact.name", "Mac Dynamic Island")}
			</p>
			<p className="text-xs text-text-dim">
				{pluginText(t, "marketplace.plugins.macCompact.desc", "Requires Island for Windows v0.5.21 or later.")}
			</p>
		</div>
	);
}
