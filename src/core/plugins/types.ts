import type { MessageKey } from "../i18n";
import type { IslandMode } from "../types";

export type PluginCategory = "productivity" | "media" | "tools" | "developer" | "system" | "social";

export interface PluginSettingField {
	key: string;
	label: string;
	labelKey?: MessageKey;
	description?: string;
	descriptionKey?: MessageKey;
	type: "text" | "number" | "boolean" | "select" | "password";
	options?: { label: string; labelKey?: MessageKey; value: string }[];
	default: unknown;
}

export interface PluginManifest {
	sdkVersion?: number;
	packageUrl?: string;
	sha256?: string;
	packageSize?: number;
	guide?: PluginGuide;
	id: string;
	name: string;
	titleKey?: MessageKey;
	descKey?: MessageKey;
	version: string;
	description: string;
	author: {
		name: string;
		url?: string;
	};
	category: PluginCategory;
	appearance?: "mac-compact" | "island-overlay";
	configure?: "custom";
	behavior?: "tab-navigation";
	icon: string; // Lucide icon name or emoji or SVG
	accentColor?: string;
	homepage?: string;
	repository?: string;
	downloadUrl?: string;
	settings?: PluginSettingField[];
	permissions?: string[];
	tags?: string[];
	expandedSize?: {
		width: number;
		height: number;
	};
}

export interface InstalledPlugin {
	packageSha256?: string;
	manifest: PluginManifest;
	installedAt: number;
	enabled: boolean;
	customSettings: Record<string, unknown>;
	source: "marketplace" | "local" | "dev";
}

export interface PluginGuide {
	summary: string;
	summaryKey?: MessageKey;
	prerequisites?: string[];
	prerequisiteKeys?: MessageKey[];
	steps: {
		title: string;
		titleKey?: MessageKey;
		desc: string;
		descKey?: MessageKey;
		tip?: string;
		tipKey?: MessageKey;
		link?: { url: string; label: string; labelKey?: MessageKey };
	}[];
	features?: string[];
	featuresKeys?: MessageKey[];
	faq?: { q: string; a: string; qKey?: MessageKey; aKey?: MessageKey }[];
}

export interface IslandOverlayRect {
	x: number;
	y: number;
	width: number;
	height: number;
	radius?: number;
	shape: "pill" | "notch" | "circle";
	role: "main" | "task" | "overflow" | "status";
}

export interface IslandOverlayLayout {
	mode: IslandMode;
	style: "dynamic" | "windows";
	attachedNotch: boolean;
	macCompact: boolean;
	separated: boolean;
	groupWidth: number;
	groupHeight: number;
	notch?: { ear: number; earHeight: number; radius: number; radiusY: number };
	main: IslandOverlayRect;
	side: IslandOverlayRect[];
}

export interface PluginPackage {
	formatVersion: 1;
	manifest: PluginManifest;
	code: string;
	css: string;
}

export interface LoadedPluginPackage extends Omit<PluginPackage, "formatVersion"> {
	sha256: string;
}
