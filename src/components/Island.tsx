import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useAppearance } from "../core/appearance";
import { useTauriEvent } from "../core/bridge";
import { cn } from "../core/cn";
import { useSyncLocale, useT } from "../core/i18n";
import { type IslandApi, IslandContext, tabNavigation } from "../core/island";
import { macAppearanceEnabled } from "../core/plugins/appearancePlugin";
import { useInstalledPlugins } from "../core/plugins/registry";
import { PluginBackgrounds } from "../core/plugins/runtime";
import { islandStatusRing, STATUS_RING_PLUGIN } from "../core/plugins/statusRing";
import { readNumberSetting, sizeSettings, taskCountSetting, topMarginSetting, useSettings } from "../core/settings";
import { moduleShortcutFocus } from "../core/shortcuts";
import { useHitRects } from "../core/useHitRects";
import { useIslandController } from "../core/useIslandController";
import { useIslandDrag } from "../core/useIslandDrag";
import { builtinModules } from "../modules";
import { requestAskFocus } from "../modules/ask/store";
import { requestFindFocus } from "../modules/find/store";
import { AmbientBubbles, SideBubbles } from "./island/Bubbles";
import { islandContent } from "./island/content";
import { ambientWidth, BUBBLE_GAP, fitGeometry, geometry, MAC_CAMERA_BAND, variantOf } from "./island/geometry";
import { launcherSize } from "./island/Launcher";
import { MacCamera } from "./island/MacCamera";
import { Rim } from "./island/Rim";
import { StatusRing } from "./island/StatusRing";
import { Surface, surfaceTint } from "./island/Surface";
import { useIslandFileDrop } from "./island/useIslandFileDrop";

export function Island() {
	const plugins = useInstalledPlugins();
	const t = useT();
	const statusReading = islandStatusRing.use();
	const navigation = tabNavigation.use();
	const ctl = useIslandController(builtinModules);
	const { mode, primary, focused } = ctl;
	const baseLook = useAppearance();
	const macCompact = macAppearanceEnabled(plugins);
	const [macCompactWidth, setMacCompactWidth] = useState(128);
	const [macCompactHidden, setMacCompactHidden] = useState(false);
	const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
	useEffect(() => {
		const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
		window.addEventListener("resize", resize);
		return () => window.removeEventListener("resize", resize);
	}, []);
	const look = macCompact ? { ...baseLook, style: "windows" as const, idleClock: false, rim: [] } : baseLook;
	const glassPluginEnabled = plugins.some(
		(plugin) => plugin.manifest.id === "com.island.desktop-glass" && plugin.enabled && Boolean(plugin.packageSha256),
	);
	const islandLook = glassPluginEnabled && !macCompact ? look : { ...look, blurEffect: "none" as const };
	const tint = surfaceTint(islandLook.blurEffect);
	const s = useSettings();
	const topMargin = readNumberSetting(s, topMarginSetting(look.style));
	const windows = look.style === "windows";
	const v = variantOf(look);
	const effectiveTop = Math.min(v.top + topMargin, Math.max(0, viewport.height - 64));
	const attachedNotch = !windows && effectiveTop === 0;
	useSyncLocale();
	useIslandFileDrop(ctl);

	const big = mode === "expanded" || mode === "peek";
	const resting = mode === "compact" || mode === "idle";
	const statusPlugin = plugins.find(
		(plugin) => plugin.manifest.id === STATUS_RING_PLUGIN && plugin.enabled && Boolean(plugin.packageSha256),
	);
	const status = statusPlugin?.customSettings.placement !== "taskbar" && statusPlugin && statusReading && (
		<StatusRing reading={statusReading} />
	);
	const expandedStatus =
		!windows && mode === "expanded" && statusPlugin && statusReading ? (
			<StatusRing reading={statusReading} onClick={() => ctl.expand(STATUS_RING_PLUGIN)} />
		) : null;
	const taskCount = readNumberSetting(s, taskCountSetting);
	const secondaryTask = mode === "compact" && taskCount > 1 ? ctl.activeTasks[1] : undefined;
	const sideTasks = mode === "compact" ? ctl.activeTasks.slice(2, taskCount) : [];
	const sideStatus = windows && resting && !(macCompact && macCompactHidden) && status ? status : null;
	const sideCount = sideTasks.length + Number(Boolean(sideStatus));
	const panelSize = (ctl.launcher ? launcherSize(ctl.entries.length) : focused?.view.expandedSize) ?? v.expanded;
	// A shared width keeps the top bar in place as the body changes height and content.
	const bigSize =
		big && !v.tabsAtBottom
			? {
					height: panelSize.height,
					width: ctl.entries.reduce((widest, { view }) => {
						const width = view.expandedSize?.width ?? 0;
						return Number.isFinite(width) ? Math.max(widest, width) : widest;
					}, v.expanded.width),
				}
			: panelSize;
	const content = islandContent(ctl, look, v, t, macCompact, navigation, expandedStatus, secondaryTask);
	useEffect(() => {
		if (!macCompact || mode !== "compact") return;
		let element: HTMLElement | null = null;
		const measure = () => {
			const next = document.querySelector<HTMLElement>("[data-mac-compact-content]");
			if (next !== element) {
				if (element) observer.unobserve(element);
				element = next;
				if (element) observer.observe(element);
			}
			if (!element) return;
			const width = Math.max(88, Math.min(window.innerWidth - 24, element.offsetWidth));
			setMacCompactWidth((current) => (current === width ? current : width));
		};
		const observer = new ResizeObserver(measure);
		const mutations = new MutationObserver(measure);
		mutations.observe(document.body, { childList: true, subtree: true });
		measure();
		return () => {
			observer.disconnect();
			mutations.disconnect();
		};
	}, [macCompact, mode]);
	const ringSize = expandedStatus ? { ...bigSize, height: bigSize.height + 36 } : bigSize;
	const baseGeometry = geometry(v, look, mode, ringSize, primary, macCompact, macCompactWidth, secondaryTask ? 94 : 0);
	const g = fitGeometry(baseGeometry, {
		widthPercent: readNumberSetting(s, sizeSettings.width),
		heightPercent: readNumberSetting(s, sizeSettings.height),
		maxWidth: viewport.width - 24 - (attachedNotch ? 3 * baseGeometry.ear : 0),
		maxHeight: viewport.height - effectiveTop,
		attachedNotch,
	});
	useHitRects(islandLook.blurEffect, windows);
	const hidden = !macCompact && mode === "hidden";
	const swallowed = !macCompact && mode === "swallowed";
	const hideMacCompact = macCompact && macCompactHidden;
	const anchorOnly = macCompact && (mode === "hidden" || mode === "swallowed");
	const macMusic = macCompact && mode === "compact" && primary?.module.id === "music";
	const contentTop = macCompact && big ? MAC_CAMERA_BAND : 0;
	const transition = big ? v.expandSpring : v.shellSpring;

	const drag = useIslandDrag({
		width: g.width,
		leftExtra:
			(attachedNotch ? g.ear : 0) + (resting ? ambientWidth(ctl.entries.filter((e) => e.view.ambient).length) : 0),
		rightExtra: (attachedNotch ? g.ear : 0) + ambientWidth(sideCount),
		canReturn: !big,
		onDragChange: ctl.lockHover,
	});

	// Global shortcut: the page opens (controller) and its input takes the keyboard.
	useTauriEvent<string>("island://toggle-module", (id) => {
		const opened = ctl.toggleShortcut(id);
		moduleShortcutFocus.set(opened ? id : null);
		if (!opened) return;
		if (id === "ask") requestAskFocus();
		if (id === "find") requestFindFocus();
	});
	useTauriEvent("island://toggle-mac-compact-visibility", () => {
		if (macCompact) setMacCompactHidden((hidden) => !hidden);
	});

	const api: IslandApi = useMemo(
		() => ({ mode, tab: ctl.tab, expand: ctl.expand, collapse: ctl.collapse, keepOpen: ctl.keepOpen }),
		[mode, ctl.tab, ctl.expand, ctl.collapse, ctl.keepOpen],
	);

	const rim = windows && !macCompact ? <Rim look={look} /> : null;
	const bubble = { transition: v.shellSpring, rim, onOpen: ctl.expand };

	return (
		<IslandContext.Provider value={api}>
			<PluginBackgrounds plugins={plugins} />
			<div
				data-mac-compact-stage={macCompact || undefined}
				className="pointer-events-none fixed inset-0 flex items-start justify-center"
			>
				{/* Scale into the tray and spring back out when the island is hidden or restored. */}
				<motion.div
					className="pointer-events-none relative flex origin-center justify-center"
					initial={false}
					aria-hidden={hideMacCompact || undefined}
					animate={swallowed || hideMacCompact ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
					transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.9, bounce: 0 }}
				>
					<motion.div
						className={cn(
							"pointer-events-auto relative touch-none will-change-[width,height,transform]",
							(anchorOnly || hideMacCompact) && "pointer-events-none",
							drag.dragging && "cursor-grabbing **:cursor-grabbing",
						)}
						{...(hidden || swallowed || anchorOnly || hideMacCompact ? {} : { "data-hit": true })}
						data-hit-module={mode === "compact" ? primary?.module.id : undefined}
						data-blur={islandLook.blurEffect !== "none"}
						{...ctl.domHover}
						style={{ ...drag.style, marginTop: effectiveTop }}
						onPointerDown={drag.onPointerDown}
						onClickCapture={drag.onClickCapture}
						onUpdate={drag.onShellUpdate}
						onWheel={ctl.onWheel}
						initial={false}
						animate={{
							width: g.width,
							height: g.height,
							opacity: hidden ? 0 : 1,
							y: hidden ? -g.height - 12 - effectiveTop : 0,
						}}
						transition={transition}
						onClick={() => {
							if (resting || mode === "peek") ctl.expand(macMusic ? "music" : undefined);
						}}
						onMouseEnter={() => {
							if (macCompact && !macMusic && mode === "compact" && primary) ctl.expand(primary.module.id);
							else ctl.domHover.onMouseEnter?.();
						}}
					>
						{attachedNotch && (
							<>
								<motion.span
									data-notch-ear
									className="pointer-events-none absolute top-0 right-full"
									style={{
										background: `radial-gradient(ellipse farthest-side at 0 100%, transparent 99%, ${tint} 100%)`,
									}}
									initial={false}
									animate={{ width: g.ear, height: g.ear }}
									transition={transition}
								/>
								<motion.span
									className="pointer-events-none absolute top-0 left-full"
									style={{
										background: `radial-gradient(ellipse farthest-side at 100% 100%, transparent 99%, ${tint} 100%)`,
									}}
									initial={false}
									animate={{ width: g.ear, height: g.ear }}
									transition={transition}
								/>
							</>
						)}

						<Surface
							g={g}
							big={big}
							attachedNotch={attachedNotch}
							look={islandLook}
							transition={transition}
							contentKey={content.key}
							contentTop={contentTop}
							macCompact={macCompact}
							macCompactInline={macCompact && mode === "compact"}
							rim={rim}
						>
							{content.node}
						</Surface>
						{macCompact && <MacCamera />}

						<AmbientBubbles entries={ctl.entries} visible={resting} shrunk={mode === "idle" && !windows} {...bubble} />
						<SideBubbles
							entries={sideTasks}
							status={sideStatus}
							statusId={STATUS_RING_PLUGIN}
							statusLabel={t("statusRing.name")}
							offset={BUBBLE_GAP + (attachedNotch ? g.ear : 0)}
							{...bubble}
						/>
					</motion.div>
				</motion.div>
			</div>
		</IslandContext.Provider>
	);
}
