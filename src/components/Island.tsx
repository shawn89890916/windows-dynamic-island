import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useAppearance } from "../core/appearance";
import { useTauriEvent } from "../core/bridge";
import { cn } from "../core/cn";
import { useSyncLocale, useT } from "../core/i18n";
import { type IslandApi, IslandContext, tabNavigation } from "../core/island";
import { isIslandOverlayPlugin } from "../core/plugins/appearancePlugin";
import { useInstalledPlugins } from "../core/plugins/registry";
import { ExternalPluginAppearance, PluginBackgrounds } from "../core/plugins/runtime";
import { islandStatusRing, STATUS_RING_PLUGIN } from "../core/plugins/statusRing";
import type { IslandOverlayLayout, IslandOverlayRect } from "../core/plugins/types";
import {
	mainTaskCountSetting,
	readNumberSetting,
	sizeSettings,
	taskCountSetting,
	topMarginSetting,
	useSettings,
} from "../core/settings";
import { moduleShortcutFocus } from "../core/shortcuts";
import { useHitRects } from "../core/useHitRects";
import { useIslandController } from "../core/useIslandController";
import { useIslandDrag } from "../core/useIslandDrag";
import { builtinModules } from "../modules";
import { requestAskFocus } from "../modules/ask/store";
import { requestFindFocus } from "../modules/find/store";
import { AmbientBubbles, SideBubbles } from "./island/Bubbles";
import { islandContent } from "./island/content";
import {
	ambientWidth,
	BUBBLE_GAP,
	fitGeometry,
	fitSeparatedCapsules,
	geometry,
	MAC_CAMERA_BAND,
	SECONDARY_TASK_WIDTH,
	SEPARATED_CAPSULE_GAP,
	SEPARATED_NOTCH_WIDTH,
	SEPARATED_OVERFLOW_WIDTH,
	SEPARATED_PILL_WIDTH,
	SEPARATED_STATUS_WIDTH,
	variantOf,
} from "./island/geometry";
import { launcherSize } from "./island/Launcher";
import { MacCamera } from "./island/MacCamera";
import { AttachedNotchRim, Rim } from "./island/Rim";
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
	const macCompactPlugin = plugins.find(
		(plugin) => plugin.enabled && Boolean(plugin.packageSha256) && plugin.manifest.appearance === "mac-compact",
	);
	const macCompact = Boolean(macCompactPlugin);
	const macCameraVisible = macCompactPlugin?.customSettings.showCamera !== false;
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
	const festivePlugin = plugins.find(
		(plugin) =>
			plugin.manifest.id === "com.island.festive-island" &&
			plugin.enabled &&
			Boolean(plugin.packageSha256) &&
			isIslandOverlayPlugin(plugin.manifest),
	);
	const status = statusPlugin?.customSettings.placement !== "taskbar" && statusPlugin && statusReading && (
		<StatusRing reading={statusReading} size={26} />
	);
	const toolbarStatus =
		big && statusPlugin && statusPlugin.customSettings.placement !== "taskbar" && statusReading ? (
			<StatusRing reading={statusReading} size={24} onClick={() => ctl.expand(STATUS_RING_PLUGIN)} />
		) : null;
	const taskCount = readNumberSetting(s, taskCountSetting);
	const taskArrangement = readNumberSetting(s, mainTaskCountSetting);
	const separatedLayout = taskArrangement === 3;
	const separatedCapsulesActive = separatedLayout && mode === "compact";
	const mainTaskCount = separatedLayout ? 1 : Math.min(taskCount, taskArrangement);
	const secondaryTask = mode === "compact" && mainTaskCount > 1 ? ctl.activeTasks[1] : undefined;
	const expandedTaskEntries =
		separatedLayout && big && !ctl.launcher
			? ctl.activeTasks
					.filter((entry) => entry.module.id === focused?.module.id || entry.view.sideEligible !== false)
					.slice(0, taskCount)
			: [];
	const sideTasks = separatedCapsulesActive
		? ctl.activeTasks
				.filter((entry) => entry.view.sideEligible !== false)
				.filter((entry) => entry.module.id !== primary?.module.id)
				.slice(
					0,
					Math.max(0, taskCount - Number(ctl.activeTasks.some((entry) => entry.module.id === primary?.module.id))),
				)
		: mode === "compact"
			? ctl.activeTasks.slice(mainTaskCount, taskCount)
			: [];
	const sideStatus = windows && resting && !(macCompact && macCompactHidden) && status ? status : null;
	const sideTaskSignature = sideTasks.map((entry) => entry.module.id).join("|");
	const [settledSideIds, setSettledSideIds] = useState<string[]>([]);
	useEffect(() => {
		if (!separatedLayout) return;
		const timer = window.setTimeout(
			() => setSettledSideIds(sideTaskSignature ? sideTaskSignature.split("|") : []),
			140,
		);
		return () => window.clearTimeout(timer);
	}, [separatedLayout, sideTaskSignature]);
	const stableSideTasks = separatedLayout
		? sideTasks.filter((entry) => settledSideIds.includes(entry.module.id))
		: sideTasks;
	const basePanelSize = (ctl.launcher ? launcherSize(ctl.entries.length) : focused?.view.expandedSize) ?? v.expanded;
	const panelSize =
		expandedTaskEntries.length > 1 ? { ...basePanelSize, height: basePanelSize.height + 44 } : basePanelSize;
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
	const content = islandContent(
		ctl,
		look,
		v,
		t,
		macCompact,
		navigation,
		toolbarStatus,
		secondaryTask,
		expandedTaskEntries,
	);
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
	const baseGeometry = geometry(v, look, mode, bigSize, primary, macCompact, macCompactWidth);
	const ambientLeftExtra = resting ? ambientWidth(ctl.entries.filter((entry) => entry.view.ambient).length) : 0;
	const minimumSideSpace =
		separatedCapsulesActive && stableSideTasks.length > 0 ? SEPARATED_OVERFLOW_WIDTH + BUBBLE_GAP : 0;
	const g = fitGeometry(baseGeometry, {
		widthPercent: big ? 100 : readNumberSetting(s, sizeSettings.width),
		heightPercent: big ? 100 : readNumberSetting(s, sizeSettings.height),
		maxWidth: viewport.width - 24 - (attachedNotch ? 3 * baseGeometry.ear : 0) - ambientLeftExtra - minimumSideSpace,
		maxHeight: viewport.height - effectiveTop,
		attachedNotch,
		extraWidth: secondaryTask && !macCompact ? SECONDARY_TASK_WIDTH : 0,
	});
	const leftExtra = (attachedNotch ? g.ear : 0) + ambientLeftExtra;
	const sideOffset = BUBBLE_GAP + (attachedNotch ? g.ear : 0);
	const separatedCapsuleWidth = attachedNotch ? SEPARATED_NOTCH_WIDTH : SEPARATED_PILL_WIDTH;
	const availableSideWidth = Math.max(0, viewport.width - 24 - g.width - leftExtra - sideOffset);
	const separatedFit = fitSeparatedCapsules(
		stableSideTasks.length,
		availableSideWidth,
		separatedCapsuleWidth,
		sideStatus ? SEPARATED_STATUS_WIDTH : 0,
	);
	const shownSideTasks = separatedCapsulesActive ? stableSideTasks.slice(0, separatedFit.visible) : sideTasks;
	const foldedSideTasks = separatedCapsulesActive ? stableSideTasks.slice(separatedFit.visible) : [];
	const separatedSideWidth = separatedCapsulesActive
		? shownSideTasks.length * separatedCapsuleWidth +
			Math.max(0, shownSideTasks.length - 1) * SEPARATED_CAPSULE_GAP +
			(foldedSideTasks.length ? SEPARATED_OVERFLOW_WIDTH + (shownSideTasks.length ? SEPARATED_CAPSULE_GAP : 0) : 0) +
			(sideStatus
				? SEPARATED_STATUS_WIDTH + (shownSideTasks.length || foldedSideTasks.length ? SEPARATED_CAPSULE_GAP : 0)
				: 0)
		: 0;
	const sideCount = shownSideTasks.length + Number(foldedSideTasks.length > 0) + Number(Boolean(sideStatus));
	const separatedRects: IslandOverlayRect[] = [];
	const bubbleY = attachedNotch ? 0 : Math.max(0, (g.height - 38) / 2);
	const capsuleY = attachedNotch ? 0 : Math.max(0, (g.height - 38) / 2);
	let capsuleX = leftExtra + g.width + sideOffset;
	if (separatedCapsulesActive) {
		for (const _entry of shownSideTasks) {
			separatedRects.push({
				x: capsuleX,
				y: capsuleY,
				width: separatedCapsuleWidth,
				height: attachedNotch ? 32 : 38,
				shape: attachedNotch ? "notch" : "pill",
				role: "task",
			});
			capsuleX += separatedCapsuleWidth + SEPARATED_CAPSULE_GAP;
		}
		if (foldedSideTasks.length) {
			if (shownSideTasks.length) capsuleX += SEPARATED_CAPSULE_GAP;
			separatedRects.push({
				x: capsuleX,
				y: capsuleY,
				width: SEPARATED_OVERFLOW_WIDTH,
				height: attachedNotch ? 32 : 38,
				shape: attachedNotch ? "notch" : "pill",
				role: "overflow",
			});
			capsuleX += SEPARATED_OVERFLOW_WIDTH + SEPARATED_CAPSULE_GAP;
		}
		if (sideStatus)
			separatedRects.push({ x: capsuleX, y: bubbleY, width: 32, height: 32, shape: "circle", role: "status" });
	} else {
		for (let index = 0; index < sideTasks.length; index++) {
			separatedRects.push({ x: capsuleX, y: bubbleY, width: 38, height: 38, shape: "circle", role: "task" });
			capsuleX += 46;
		}
		if (sideStatus)
			separatedRects.push({ x: capsuleX, y: bubbleY + 3, width: 32, height: 32, shape: "circle", role: "status" });
	}
	if (resting) {
		const ambientEntries = ctl.entries.filter((entry) => entry.view.ambient);
		for (let index = 0; index < ambientEntries.length; index++) {
			separatedRects.push({
				x: ambientLeftExtra - 48 - index * 46,
				y: bubbleY,
				width: 38,
				height: 38,
				shape: "circle",
				role: "task",
			});
		}
	}
	const groupWidth =
		leftExtra +
		g.width +
		(separatedCapsulesActive && separatedSideWidth > 0
			? sideOffset + separatedSideWidth
			: (attachedNotch ? g.ear : 0) + ambientWidth(sideCount));
	const overlayLayout: IslandOverlayLayout = {
		mode,
		style: windows ? "windows" : "dynamic",
		attachedNotch,
		macCompact,
		separated: separatedCapsulesActive && shownSideTasks.length > 0,
		groupWidth,
		groupHeight: Math.max(g.height, ...separatedRects.map((rect) => rect.y + rect.height)),
		notch: attachedNotch ? { ear: g.ear, earHeight: g.earHeight, radius: g.radius, radiusY: g.radiusY } : undefined,
		main: {
			x: leftExtra,
			y: 0,
			width: g.width,
			height: g.height,
			shape: attachedNotch ? "notch" : "pill",
			role: "main",
		},
		side: separatedRects,
	};
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
		leftExtra,
		rightExtra: separatedCapsulesActive
			? separatedSideWidth > 0
				? sideOffset + separatedSideWidth
				: 0
			: (attachedNotch ? g.ear : 0) + ambientWidth(sideCount),
		centerSideBubbles: separatedCapsulesActive && separatedSideWidth > 0,
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

	const rim = !macCompact && big && !attachedNotch ? <Rim look={look} openTop={!windows} /> : null;
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
									animate={{ width: g.ear, height: g.earHeight }}
									transition={transition}
								/>
								<motion.span
									className="pointer-events-none absolute top-0 left-full"
									style={{
										background: `radial-gradient(ellipse farthest-side at 100% 100%, transparent 99%, ${tint} 100%)`,
									}}
									initial={false}
									animate={{ width: g.ear, height: g.earHeight }}
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
						{attachedNotch && !macCompact && big && (
							<AttachedNotchRim
								look={look}
								width={g.width}
								height={g.height}
								ear={g.ear}
								earHeight={g.earHeight}
								radius={g.radius}
								radiusY={g.radiusY}
							/>
						)}
						{macCompact && macCameraVisible && <MacCamera />}

						<AmbientBubbles entries={ctl.entries} visible={resting} shrunk={mode === "idle" && !windows} {...bubble} />
						<SideBubbles
							entries={shownSideTasks}
							separated={separatedCapsulesActive}
							notchStyle={attachedNotch}
							overflowCount={foldedSideTasks.length}
							overflowId={foldedSideTasks[0]?.module.id}
							status={sideStatus}
							statusId={STATUS_RING_PLUGIN}
							statusLabel={t("statusRing.name")}
							offset={BUBBLE_GAP + (attachedNotch ? g.ear : 0)}
							{...bubble}
						/>
						{festivePlugin && mode !== "hidden" && mode !== "swallowed" && (
							<div
								aria-hidden="true"
								className="pointer-events-none absolute top-0 z-30 overflow-visible"
								style={{ left: -leftExtra, width: overlayLayout.groupWidth, height: overlayLayout.groupHeight }}
							>
								<ExternalPluginAppearance plugin={festivePlugin} layout={overlayLayout} />
							</div>
						)}
					</motion.div>
				</motion.div>
			</div>
		</IslandContext.Provider>
	);
}
