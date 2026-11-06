import { motion } from "motion/react";
import { useMemo } from "react";
import { useAppearance } from "../core/appearance";
import { useTauriEvent } from "../core/bridge";
import { cn } from "../core/cn";
import { useSyncLocale } from "../core/i18n";
import { type IslandApi, IslandContext } from "../core/island";
import { macAppearanceEnabled } from "../core/plugins/appearancePlugin";
import { useInstalledPlugins } from "../core/plugins/registry";
import { PluginBackgrounds } from "../core/plugins/runtime";
import { positionSettings, readSetting, useSettings } from "../core/settings";
import { moduleShortcutFocus } from "../core/shortcuts";
import { useHitRects } from "../core/useHitRects";
import { useIslandController } from "../core/useIslandController";
import { useIslandDrag } from "../core/useIslandDrag";
import { builtinModules } from "../modules";
import { requestAskFocus } from "../modules/ask/store";
import { requestFindFocus } from "../modules/find/store";
import { AmbientBubbles, SecondaryBubble } from "./island/Bubbles";
import { islandContent } from "./island/content";
import { ambientWidth, BUBBLE, BUBBLE_GAP, geometry, MAC_CAMERA_BAND, variantOf } from "./island/geometry";
import { launcherSize } from "./island/Launcher";
import { MacCamera } from "./island/MacCamera";
import { Rim } from "./island/Rim";
import { Surface } from "./island/Surface";
import { useIslandFileDrop } from "./island/useIslandFileDrop";

export function Island() {
	const plugins = useInstalledPlugins();
	const ctl = useIslandController(builtinModules);
	const { mode, primary, secondary, focused } = ctl;
	const baseLook = useAppearance();
	const macCompact = macAppearanceEnabled(plugins);
	const look = macCompact ? { ...baseLook, style: "windows" as const, idleClock: false, rim: [] } : baseLook;
	const glassPluginEnabled = plugins.some(
		(plugin) => plugin.manifest.id === "com.island.desktop-glass" && plugin.enabled && Boolean(plugin.packageSha256),
	);
	const islandLook = glassPluginEnabled && !macCompact ? look : { ...look, blurEffect: "none" as const };
	const s = useSettings();
	const topMargin = Math.max(0, Number(readSetting(s, positionSettings.topMargin)) || 0);
	const windows = look.style === "windows";
	const v = variantOf(look);
	const effectiveTop = v.top + topMargin;
	useSyncLocale();
	useIslandFileDrop(ctl);

	const bigSize = ctl.launcher ? launcherSize(ctl.entries.length) : focused?.view.expandedSize;
	const g = geometry(v, look, mode, bigSize, primary, macCompact);
	useHitRects(islandLook.blurEffect, windows, g.radius);
	const big = mode === "expanded" || mode === "peek";
	const hidden = !macCompact && mode === "hidden";
	const swallowed = !macCompact && mode === "swallowed";
	const anchorOnly = macCompact && (mode === "hidden" || mode === "swallowed");
	const macMusic = macCompact && mode === "compact" && primary?.module.id === "music";
	const contentTop = macCompact && big ? MAC_CAMERA_BAND : 0;
	const resting = mode === "compact" || mode === "idle";
	const showSecondary = mode === "compact" && secondary !== undefined;
	const transition = big ? v.expandSpring : v.shellSpring;

	const drag = useIslandDrag({
		width: g.width,
		leftExtra:
			(effectiveTop > 0 ? 0 : g.ear) + (resting ? ambientWidth(ctl.entries.filter((e) => e.view.ambient).length) : 0),
		rightExtra: (effectiveTop > 0 ? 0 : g.ear) + (showSecondary ? BUBBLE_GAP + BUBBLE : 0),
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

	const api: IslandApi = useMemo(
		() => ({ mode, tab: ctl.tab, expand: ctl.expand, collapse: ctl.collapse, keepOpen: ctl.keepOpen }),
		[mode, ctl.tab, ctl.expand, ctl.collapse, ctl.keepOpen],
	);

	const content = islandContent(ctl, look, v);
	const rim = windows && !macCompact ? <Rim look={look} /> : null;
	const bubble = { transition: v.shellSpring, rim, onOpen: ctl.expand };

	return (
		<IslandContext.Provider value={api}>
			<PluginBackgrounds plugins={plugins} />
			<div className="pointer-events-none fixed inset-0 flex items-start justify-center">
				{/* The tray's black hole: the island spins into its own center and comes back out. */}
				<motion.div
					className="pointer-events-none relative flex origin-center justify-center"
					initial={false}
					animate={swallowed ? { scale: 0, rotate: -200, opacity: 0 } : { scale: 1, rotate: 0, opacity: 1 }}
					transition={
						swallowed
							? { duration: 0.46, ease: [0.55, 0, 1, 0.45] }
							: { duration: 0.56, ease: [0.34, 1.4, 0.64, 1], opacity: { duration: 0.26 } }
					}
				>
					<motion.div
						className={cn(
							"pointer-events-auto relative touch-none will-change-[width,height,transform]",
							anchorOnly && "pointer-events-none",
							drag.dragging && "cursor-grabbing **:cursor-grabbing",
						)}
						{...(hidden || swallowed || anchorOnly ? {} : { "data-hit": true })}
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
							if (macMusic) ctl.domHover.onMouseEnter?.();
							else if (mode === "compact" && primary) ctl.expand(primary.module.id);
						}}
					>
						{/* Concave "ears" that blend the notch into the top edge of the screen. Only when attached to screen top */}
						{!windows && effectiveTop === 0 && (
							<>
								<motion.span
									className="pointer-events-none absolute top-0 right-full bg-[radial-gradient(circle_at_0_100%,transparent_70%,var(--island)_71%)]"
									initial={false}
									animate={{ width: g.ear, height: g.ear }}
									transition={v.shellSpring}
								/>
								<motion.span
									className="pointer-events-none absolute top-0 left-full bg-[radial-gradient(circle_at_100%_100%,transparent_70%,var(--island)_71%)]"
									initial={false}
									animate={{ width: g.ear, height: g.ear }}
									transition={v.shellSpring}
								/>
							</>
						)}

						<Surface
							g={g}
							big={big}
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
						<SecondaryBubble entry={showSecondary ? secondary : undefined} {...bubble} />
					</motion.div>
				</motion.div>
			</div>
		</IslandContext.Provider>
	);
}
