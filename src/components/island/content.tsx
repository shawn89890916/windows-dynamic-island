import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import type { Appearance } from "../../core/appearance";
import { cn } from "../../core/cn";
import type { TabNavigationOptions } from "../../core/island";
import type { IslandController } from "../../core/useIslandController";
import { IdleClock } from "../IdleClock";
import type { Variant } from "./geometry";
import { Launcher } from "./Launcher";
import { Tabs } from "./Tabs";

/** 内容单独淡入，导航栏和共享滑块在切换时保持挂载。 */
function Panel({ children, duration }: { children: ReactNode; duration: number }) {
	const reducedMotion = useReducedMotion();
	return (
		<motion.div
			className="island-panel min-h-0 flex-1 overflow-y-auto no-scrollbar select-none"
			data-scroll
			initial={{ opacity: reducedMotion || !duration ? 1 : 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: duration / 1000 }}
		>
			{children}
		</motion.div>
	);
}

/** 展开状态共用外层 key，模块内容单独过渡，让导航栏保持连续。 */
export function islandContent(
	ctl: IslandController,
	look: Appearance,
	v: Variant,
	macCompact = false,
	navigation: TabNavigationOptions | null = null,
): { key: string; node: ReactNode } {
	const { mode, primary, focused } = ctl;
	const windows = look.style === "windows";

	if (mode === "compact" && primary?.view.compact) {
		return {
			key: `compact:${primary.module.id}`,
			node: (
				<div className={cn("flex h-full items-center justify-between", macCompact ? "gap-1 px-0" : "pr-3 pl-2")}>
					<div className={cn("flex min-w-0 items-center", macCompact ? "gap-1" : "gap-2")}>
						{primary.view.compact.left}
					</div>
					<div className={cn("flex min-w-0 items-center justify-end", macCompact ? "gap-1" : "gap-2")}>
						{primary.view.compact.right}
					</div>
				</div>
			),
		};
	}

	if ((mode === "expanded" || mode === "peek") && (focused || ctl.launcher)) {
		const tabs = (
			<Tabs
				entries={ctl.tabs}
				current={ctl.tab}
				onSelect={(id) => {
					ctl.setTab(id);
					ctl.expand(id);
				}}
				onReorder={ctl.reorderTabs}
				iconsOnly={windows}
				bottom={v.tabsAtBottom}
				transition={v.shellSpring}
				navigation={navigation}
				extra={ctl.launcher ? undefined : focused?.view.tabBarExtra}
			/>
		);
		return {
			key: navigation ? "big" : ctl.launcher ? "big:launcher" : `big:${focused?.module.id}`,
			node: (
				<div className={cn("flex h-full flex-col px-5 pt-3.5 pb-4.5 overflow-hidden", v.tabsAtBottom && "pb-2")}>
					{!v.tabsAtBottom && tabs}
					<Panel key={ctl.launcher ? "launcher" : focused?.module.id} duration={navigation?.fadeDurationMs ?? 0}>
						{ctl.launcher ? <Launcher entries={ctl.entries} onSelect={ctl.setTab} /> : focused?.view.expanded}
					</Panel>
					{v.tabsAtBottom && tabs}
				</div>
			),
		};
	}

	if (windows && look.idleClock && (mode === "idle" || mode === "swallowed")) {
		return { key: "clock", node: <IdleClock /> };
	}

	return { key: "idle", node: null };
}
