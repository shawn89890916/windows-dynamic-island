import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import type { Appearance } from "../../core/appearance";
import { cn } from "../../core/cn";
import type { Translate } from "../../core/i18n";
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
	t: Translate,
	macCompact = false,
	navigation: TabNavigationOptions | null = null,
	status: ReactNode = null,
	secondaryTask?: IslandController["activeTasks"][number],
): { key: string; node: ReactNode } {
	const { mode, primary, focused } = ctl;
	const windows = look.style === "windows";

	if (mode === "compact" && primary?.view.compact) {
		return {
			key: `compact:${primary.module.id}`,
			node: (
				<div className={cn("flex h-full items-center justify-between", macCompact ? "gap-1 px-0" : "gap-1 pr-2 pl-2")}>
					<div className="flex min-w-0 flex-1 items-center justify-between gap-2">
						<div className={cn("flex min-w-0 items-center", macCompact ? "gap-1" : "gap-2")}>
							{primary.view.compact.left}
						</div>
						<div className={cn("flex min-w-0 items-center justify-end", macCompact ? "gap-1" : "gap-2")}>
							{primary.view.compact.right}
						</div>
					</div>
					{secondaryTask && (
						<motion.button
							key={secondaryTask.module.id}
							type="button"
							aria-label={t(secondaryTask.module.title)}
							title={t(secondaryTask.module.title)}
							data-no-drag
							data-hit
							data-hit-module={secondaryTask.module.id}
							className="flex max-w-[90px] min-w-0 shrink-0 items-center gap-1.5 border-l border-white/15 pl-2 text-[11px] font-medium text-white/85"
							initial={{ opacity: 0, x: 5 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.2 }}
							onClick={(event) => {
								event.stopPropagation();
								ctl.expand(secondaryTask.module.id);
							}}
						>
							<span className="grid size-4 shrink-0 place-items-center [&_svg]:size-4">{secondaryTask.view.icon}</span>
							<span className="truncate">{t(secondaryTask.module.title)}</span>
						</motion.button>
					)}
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
			// Keep the toolbar mounted while the panel content changes underneath it.
			key: "big",
			node: (
				<div className={cn("flex h-full flex-col px-5 pt-3.5 pb-4.5 overflow-hidden", v.tabsAtBottom && "pb-2")}>
					{!v.tabsAtBottom && tabs}
					{status && <div className="flex h-9 shrink-0 items-center justify-end">{status}</div>}
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
