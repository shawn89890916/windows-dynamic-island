import type { Transition } from "motion/react";
import type { Appearance } from "../../core/appearance";
import type { IslandMode, ModuleEntry } from "../../core/types";

export interface Geo {
	width: number;
	height: number;
	radius: number;
	ear: number;
}

export interface FittedGeo extends Geo {
	radiusY: number;
	earHeight: number;
}

/** Everything that differs between the two looks (see `IslandStyle`). */
export interface Variant {
	idle: Geo;
	compact: Geo;
	expanded: Geo;
	tabBar: number;
	/** Gap between the top of the screen and the island. */
	top: number;
	tabsAtBottom: boolean;
	shellSpring: Transition;
	expandSpring: Transition;
}

/** Hangs from the top edge, notch-like, with concave ears. */
const DYNAMIC: Variant = {
	idle: { width: 150, height: 8, radius: 10, ear: 6 },
	compact: { width: 265, height: 38, radius: 19, ear: 10 },
	expanded: { width: 560, height: 190, radius: 32, ear: 14 },
	tabBar: 46,
	top: 0,
	tabsAtBottom: false,
	shellSpring: { type: "spring", stiffness: 420, damping: 34, mass: 0.9 },
	expandSpring: { type: "spring", stiffness: 330, damping: 27, mass: 0.9 },
};

/** Windows Island: a floating pill with a livelier bounce, tabs at the bottom. */
const WINDOWS: Variant = {
	idle: { width: 140, height: 34, radius: 17, ear: 0 },
	compact: { width: 265, height: 38, radius: 19, ear: 0 },
	expanded: { width: 560, height: 190, radius: 34, ear: 0 },
	tabBar: 44,
	top: 8,
	tabsAtBottom: true,
	shellSpring: { type: "spring", stiffness: 380, damping: 29, mass: 0.9 },
	expandSpring: { type: "spring", stiffness: 300, damping: 20, mass: 0.9 },
};
/** Windows Island at rest without the clock: a small, empty pill. */
const WINDOWS_BARE_IDLE: Geo = { width: 110, height: 30, radius: 15, ear: 0 };
const MAC_IDLE: Geo = { width: 40, height: 24, radius: 12, ear: 0 };
const MAC_COMPACT_WIDTH = 128;
const MAC_COMPACT_HEIGHT = 38;

/** Space for the fixed camera above activity and expanded content. */
export const MAC_CAMERA_BAND = 22;

export const BUBBLE = 38;
export const BUBBLE_GAP = 10;
export const SEPARATED_CAPSULE_GAP = 8;
export const SEPARATED_PILL_WIDTH = 48;
export const SEPARATED_NOTCH_WIDTH = 48;
export const SEPARATED_OVERFLOW_WIDTH = 38;
export const SEPARATED_STATUS_WIDTH = 32;
/** 32 px for the second task icon and its divider, plus the 4 px row gap. */
export const SECONDARY_TASK_WIDTH = 36;
/** Gap between ambient bubbles (px). */
const AMBIENT_GAP = 8;

export function variantOf(look: Appearance): Variant {
	return look.style === "windows" ? { ...WINDOWS, tabsAtBottom: look.tabsPosition === "bottom" } : DYNAMIC;
}

/** The island's size and shape in a given mode. */
export function geometry(
	v: Variant,
	look: Appearance,
	mode: IslandMode,
	bigSize: { width: number; height: number } | undefined,
	primary: ModuleEntry | undefined,
	macCompact = false,
	macCompactWidth = MAC_COMPACT_WIDTH,
): Geo {
	switch (mode) {
		case "hidden":
		case "swallowed":
		case "idle":
			if (macCompact) return MAC_IDLE;
			return look.style === "windows" && !look.idleClock ? WINDOWS_BARE_IDLE : v.idle;
		case "compact":
			return {
				...v.compact,
				width: macCompact ? macCompactWidth : (primary?.view.compact?.width ?? v.compact.width),
				radius: macCompact ? MAC_COMPACT_HEIGHT / 2 : v.compact.radius,
				height: macCompact ? MAC_COMPACT_HEIGHT : v.compact.height,
			};
		case "peek":
		case "expanded": {
			const size = bigSize ?? v.expanded;
			const extra = mode === "expanded" || mode === "peek" ? v.tabBar : 0;
			return { ...v.expanded, width: size.width, height: size.height + extra + (macCompact ? MAC_CAMERA_BAND : 0) };
		}
	}
}

/** Apply user proportions while keeping the island inside the available screen area. */
export function fitGeometry(
	geo: Geo,
	{
		widthPercent,
		heightPercent,
		maxWidth,
		maxHeight,
		attachedNotch,
		extraWidth = 0,
	}: {
		widthPercent: number;
		heightPercent: number;
		maxWidth: number;
		maxHeight: number;
		attachedNotch: boolean;
		extraWidth?: number;
	},
): FittedGeo {
	const heightScale = heightPercent / 100;
	const width = Math.max(1, Math.min(maxWidth, Math.round((geo.width * widthPercent) / 100) + extraWidth));
	const height = Math.max(1, Math.min(maxHeight, Math.round(geo.height * heightScale)));
	const ear = Math.min(geo.ear * heightScale, height);
	// Keep room for the bottom curve when the notch is only a few pixels tall.
	const earHeight = attachedNotch ? Math.min(ear, height / 2) : 0;
	const radiusY = Math.min(geo.radius * heightScale, width / 2, height - earHeight);
	return {
		width,
		height,
		radius: geo.ear > 0 ? Math.min(geo.radius * heightScale, width / 2) : radiusY,
		radiusY,
		ear,
		earHeight,
	};
}

/** Width taken by the ambient bubbles left of the island. */
export function ambientWidth(count: number) {
	return count ? BUBBLE_GAP + count * BUBBLE + (count - 1) * AMBIENT_GAP : 0;
}

/** Fit side capsules and reserve a compact overflow affordance when needed. */
export function fitSeparatedCapsules(count: number, availableWidth: number, capsuleWidth: number, statusWidth = 0) {
	const maxVisible = Math.max(0, count);
	const statusGap = statusWidth > 0 && maxVisible > 0 ? SEPARATED_CAPSULE_GAP : 0;
	const availableForTasks = Math.max(0, availableWidth - statusWidth - statusGap);
	for (let visible = maxVisible; visible >= 0; visible--) {
		const overflow = maxVisible - visible;
		const capsules = visible * capsuleWidth + Math.max(0, visible - 1) * SEPARATED_CAPSULE_GAP;
		const overflowWidth = overflow > 0 ? (visible > 0 ? SEPARATED_CAPSULE_GAP : 0) + SEPARATED_OVERFLOW_WIDTH : 0;
		if (capsules + overflowWidth <= availableForTasks) return { visible, overflow };
	}
	return { visible: 0, overflow: maxVisible };
}

/** CSS corner radii: the notch-like look hangs from the top, so only its bottom is round. */
export function cornerRadius(g: FittedGeo, windows: boolean) {
	const bottom = `${g.radius}px ${g.radiusY}px`;
	const top = windows ? bottom : "0px 0px";
	return {
		borderTopLeftRadius: top,
		borderTopRightRadius: top,
		borderBottomLeftRadius: bottom,
		borderBottomRightRadius: bottom,
	};
}
