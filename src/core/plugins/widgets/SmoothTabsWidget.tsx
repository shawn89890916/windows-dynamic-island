import { useEffect } from "react";
import { configureTabNavigation } from "../../island";

export function SmoothTabsWidget() {
	const supported = typeof configureTabNavigation === "function";
	return (
		<div className="flex h-full flex-col justify-center gap-3 px-5 text-text">
			<div className="text-sm font-semibold">丝滑切换</div>
			<p className="text-xs leading-relaxed text-text-dim">
				{supported
					? "鼠标停在功能图标上即可打开面板，选中框连续滑动。拖动排序时暂停悬停，设置齿轮仍需点击。"
					: "此插件需要灵动岛 v0.5.42 或更新版本。请先更新主程序，再启用插件。"}
			</p>
			<p className="text-xs leading-relaxed text-text-dim">
				在插件配置中可调整悬停等待、滑块时长和面板淡入时长；停用或卸载插件即可恢复点击切换。
			</p>
		</div>
	);
}

export function SmoothTabsBackground({ settings }: { settings: Record<string, unknown> }) {
	const hoverDelayMs = Number(settings.hoverDelayMs ?? 60);
	const slideDurationMs = Number(settings.slideDurationMs ?? 240);
	const fadeDurationMs = Number(settings.fadeDurationMs ?? 150);
	useEffect(() => {
		if (typeof configureTabNavigation !== "function") return;
		return configureTabNavigation({ hoverDelayMs, slideDurationMs, fadeDurationMs });
	}, [hoverDelayMs, slideDurationMs, fadeDurationMs]);
	return null;
}
