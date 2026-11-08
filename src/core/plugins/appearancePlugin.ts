import type { InstalledPlugin, PluginManifest } from "./types";

export function isAppearancePlugin(manifest: PluginManifest) {
	return manifest.appearance === "mac-compact";
}

export function isModulePlugin(plugin: InstalledPlugin) {
	return plugin.enabled && !isAppearancePlugin(plugin.manifest) && plugin.manifest.behavior !== "tab-navigation";
}

export function macAppearanceEnabled(plugins: InstalledPlugin[]) {
	return plugins.some(
		(plugin) => plugin.enabled && Boolean(plugin.packageSha256) && isAppearancePlugin(plugin.manifest),
	);
}
