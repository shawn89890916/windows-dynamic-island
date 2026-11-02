import {
	CloudSunIcon,
	CoffeeIcon,
	Gamepad2Icon,
	PuzzleIcon,
	StickyNoteIcon,
	TimerIcon,
	TrendingUpIcon,
} from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import type { MessageKey } from "../i18n";
import type { IslandModule, ModuleView } from "../types";
import { MARKETPLACE_CATALOG } from "./catalog";
import type { InstalledPlugin, PluginManifest } from "./types";

const STORAGE_KEY = "island_installed_plugins";

// Render matching icon
export function renderPluginIcon(iconName: string, size = 14, color?: string): ReactNode {
	const props = { size, ...(color ? { color } : {}) };
	switch (iconName) {
		case "Timer":
			return <TimerIcon {...props} />;
		case "CloudSun":
			return <CloudSunIcon {...props} />;
		case "Coffee":
			return <CoffeeIcon {...props} />;
		case "StickyNote":
			return <StickyNoteIcon {...props} />;
		case "TrendingUp":
			return <TrendingUpIcon {...props} />;
		case "Gamepad2":
			return <Gamepad2Icon {...props} />;
		default:
			return <PuzzleIcon {...props} />;
	}
}

// In-memory state and event dispatch
let installedPlugins: InstalledPlugin[] = loadInstalledPlugins();
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) listener();
}

function loadInstalledPlugins(): InstalledPlugin[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const list: InstalledPlugin[] = JSON.parse(raw);
			return list.map((item) => {
				const catalogMatch = MARKETPLACE_CATALOG.find((m) => m.id === item.manifest.id);
				if (catalogMatch) {
					return {
						...item,
						manifest: { ...catalogMatch, ...item.manifest, name: catalogMatch.name },
					};
				}
				return item;
			});
		}
	} catch {
		// fallback
	}
	// Initial demo plugin installed: Pomodoro
	const defaultPlugin = MARKETPLACE_CATALOG[0];
	return [
		{
			manifest: defaultPlugin,
			installedAt: Date.now(),
			enabled: true,
			customSettings: {},
			source: "marketplace",
		},
	];
}

function saveInstalledPlugins() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(installedPlugins));
	} catch (e) {
		console.error("Failed to save installed plugins", e);
	}
	notify();
}

export function getInstalledPlugins(): InstalledPlugin[] {
	return installedPlugins;
}

export function installPlugin(manifest: PluginManifest, source: "marketplace" | "local" | "dev" = "marketplace") {
	if (installedPlugins.some((p) => p.manifest.id === manifest.id)) {
		return;
	}
	const initialSettings: Record<string, unknown> = {};
	if (manifest.settings) {
		for (const s of manifest.settings) {
			initialSettings[s.key] = s.default;
		}
	}
	installedPlugins = [
		...installedPlugins,
		{
			manifest,
			installedAt: Date.now(),
			enabled: true,
			customSettings: initialSettings,
			source,
		},
	];
	saveInstalledPlugins();
}

export function uninstallPlugin(id: string) {
	installedPlugins = installedPlugins.filter((p) => p.manifest.id !== id);
	saveInstalledPlugins();
}

export function togglePlugin(id: string, enabled?: boolean) {
	installedPlugins = installedPlugins.map((p) => {
		if (p.manifest.id === id) {
			return { ...p, enabled: enabled ?? !p.enabled };
		}
		return p;
	});
	saveInstalledPlugins();
}

export function updatePluginSettings(id: string, settings: Record<string, unknown>) {
	installedPlugins = installedPlugins.map((p) => {
		if (p.manifest.id === id) {
			return { ...p, customSettings: { ...p.customSettings, ...settings } };
		}
		return p;
	});
	saveInstalledPlugins();
}

export function useInstalledPlugins(): InstalledPlugin[] {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		() => installedPlugins,
	);
}

/**
 * Creates an `IslandModule` wrapper from an installed community plugin.
 */
export function createPluginModule(plugin: InstalledPlugin): IslandModule {
	const { manifest, customSettings } = plugin;
	const icon = renderPluginIcon(manifest.icon, 14, manifest.accentColor);

	return {
		id: manifest.id,
		// Cast to MessageKey; translator falls back to string if missing key
		title: manifest.name as unknown as MessageKey,
		settingsIcon: renderPluginIcon(manifest.icon, 14),
		enabledByDefault: true,
		useView(): ModuleView {
			return {
				active: false,
				priority: 10,
				icon,
				accent: manifest.accentColor ?? "#818cf8",
				compact: {
					left: (
						<div className="flex items-center gap-1.5 text-xs font-medium">
							{renderPluginIcon(manifest.icon, 13, manifest.accentColor)}
							<span className="truncate">{manifest.name}</span>
						</div>
					),
					right: <span className="text-[11px] text-white/50">运行中</span>,
					width: 240,
				},
				expanded: (
					<div className="flex h-full flex-col justify-between p-4">
						<div className="flex items-start justify-between border-b border-white/8 pb-3">
							<div className="flex items-center gap-2.5">
								<div
									className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/6"
									style={{ color: manifest.accentColor }}
								>
									{renderPluginIcon(manifest.icon, 18)}
								</div>
								<div>
									<h4 className="text-[14px] font-semibold text-text">{manifest.name}</h4>
									<p className="text-[11px] text-text-faint">{manifest.description}</p>
								</div>
							</div>
							<span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-text-faint">v{manifest.version}</span>
						</div>

						<div className="my-auto flex flex-col items-center justify-center py-4 text-center">
							<p className="text-xs text-text-muted">插件运行正常 · 随时可在设置中调整参数</p>
							{manifest.settings && manifest.settings.length > 0 && (
								<div className="mt-3 flex flex-wrap gap-2">
									{manifest.settings.map((s) => (
										<div
											key={s.key}
											className="rounded-md border border-white/6 bg-white/3 px-2 py-1 text-[11px] text-text-faint"
										>
											<span className="opacity-70">{s.label}: </span>
											<span className="font-mono text-text">{String(customSettings[s.key] ?? s.default)}</span>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="flex items-center justify-between border-t border-white/6 pt-2 text-[11px] text-text-faint">
							<span>作者：{manifest.author.name}</span>
							<span>来源：{plugin.source === "marketplace" ? "官方市场" : "本地导入"}</span>
						</div>
					</div>
				),
				expandedSize: { width: 440, height: 210 },
			};
		},
	};
}
