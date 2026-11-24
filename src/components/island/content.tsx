import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import type { Appearance } from "../../core/appearance";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import type { TabNavigationOptions } from "../../core/island";
import type { ModuleEntry } from "../../core/types";
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

function SecondaryActivity({ entry, onOpen }: { entry: ModuleEntry; onOpen: (id: string) => void }) {
	const t = useT();
	const title = t(entry.module.title);
	return (
		<button
			type="button"
			data-no-drag
			data-island-secondary-activity
			className="group relative grid h-full w-10 shrink-0 place-items-center before:pointer-events-none before:absolute before:left-0 before:h-4 before:w-px before:bg-white/14 focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-white/70"
			title={title}
			aria-label={title}
			onClick={(event) => {
				event.stopPropagation();
				onOpen(entry.module.id);
			}}
		>
			<span className="grid size-7 place-items-center rounded-lg transition-colors group-hover:bg-white/10">
				{entry.view.icon}
			</span>
		</button>
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
	const { mode, primary, secondary, focused } = ctl;
	const windows = look.style === "windows";

	if (mode === "compact" && (primary?.view.compact || secondary)) {
		return {
			key: `compact:${primary?.module.id}`,
			node: (
				<div className="flex h-full items-center">
					<div
						className={cn(
							"flex h-full min-w-0 flex-1 items-center justify-between",
							macCompact ? "gap-1 pr-1" : "pr-3 pl-2",
						)}
					>
						<div className={cn("flex min-w-0 items-center", macCompact ? "gap-1" : "gap-2")}>
							{primary?.view.compact?.left}
						</div>
						<div className={cn("flex min-w-0 items-center justify-end", macCompact ? "gap-1" : "gap-2")}>
							{primary?.view.compact?.right}
						</div>
					</div>
					{secondary && <SecondaryActivity entry={secondary} onOpen={ctl.expand} />}
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
			// Keep the toolbar mounted when panels change. AnimatePresence otherwise
			// leaves an exiting toolbar over the new one, which can intercept clicks.
			key: "big",
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
