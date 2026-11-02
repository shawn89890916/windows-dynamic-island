export type PluginCategory = "productivity" | "media" | "tools" | "developer" | "system";

export interface PluginSettingField {
	key: string;
	label: string;
	description?: string;
	type: "text" | "number" | "boolean" | "select" | "password";
	options?: { label: string; value: string }[];
	default: unknown;
}

export interface PluginManifest {
	id: string;
	name: string;
	version: string;
	description: string;
	author: {
		name: string;
		url?: string;
	};
	category: PluginCategory;
	icon: string; // Lucide icon name or emoji or SVG
	accentColor?: string;
	homepage?: string;
	repository?: string;
	downloadUrl?: string;
	settings?: PluginSettingField[];
	permissions?: string[];
	tags?: string[];
}

export interface InstalledPlugin {
	manifest: PluginManifest;
	installedAt: number;
	enabled: boolean;
	customSettings: Record<string, unknown>;
	source: "marketplace" | "local" | "dev";
}
