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
import { CryptoTickerWidget } from "./widgets/CryptoTickerWidget";
import { PomodoroWidget } from "./widgets/PomodoroWidget";
import { QuickMemoWidget } from "./widgets/QuickMemoWidget";
import { SteamFriendsWidget } from "./widgets/SteamFriendsWidget";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { WorkCountdownWidget } from "./widgets/WorkCountdownWidget";

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

function renderPluginWidget(plugin: InstalledPlugin): ReactNode {
	switch (plugin.manifest.id) {
		case "com.island.pomodoro":
			return <PomodoroWidget settings={plugin.customSettings} />;
		case "com.island.crypto-ticker":
			return <CryptoTickerWidget settings={plugin.customSettings} />;
		case "com.island.work-countdown":
			return <WorkCountdownWidget settings={plugin.customSettings} />;
		case "com.island.weather":
			return <WeatherWidget settings={plugin.customSettings} />;
		case "com.island.quick-memo":
			return <QuickMemoWidget settings={plugin.customSettings} />;
		case "com.island.steam-friends":
			return <SteamFriendsWidget settings={plugin.customSettings} />;
		default:
			return <GenericPluginWidget plugin={plugin} />;
	}
}

function renderPluginCompact(plugin: InstalledPlugin): { left: ReactNode; right: ReactNode; width?: number } {
	const { manifest } = plugin;
	switch (manifest.id) {
		case "com.island.pomodoro":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
						<TimerIcon size={13} />
						<span>番茄钟 25:00</span>
					</div>
				),
				right: <span className="rounded bg-red-500/15 px-1.5 py-0.2 text-[10px] text-red-400">进行中</span>,
				width: 250,
			};
		case "com.island.crypto-ticker":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-text">
						<TrendingUpIcon size={13} className="text-emerald-400" />
						<span className="font-mono">BTC $88,420</span>
					</div>
				),
				right: <span className="text-[11px] font-semibold text-emerald-400">+3.4% ↗</span>,
				width: 260,
			};
		case "com.island.work-countdown":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
						<CoffeeIcon size={13} />
						<span>下班倒计时</span>
					</div>
				),
				right: <span className="text-[11px] text-emerald-400">摸鱼进行中</span>,
				width: 240,
			};
		case "com.island.weather":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-sky-400">
						<CloudSunIcon size={13} />
						<span>晴 22°C</span>
					</div>
				),
				right: <span className="text-[10px] text-emerald-400">空气优</span>,
				width: 230,
			};
		case "com.island.quick-memo":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
						<StickyNoteIcon size={13} />
						<span>灵动便签</span>
					</div>
				),
				right: <span className="text-[10px] text-text-faint">待办</span>,
				width: 220,
			};
		case "com.island.steam-friends":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-purple-400">
						<Gamepad2Icon size={13} />
						<span>Steam 好友</span>
					</div>
				),
				right: <span className="text-[10px] text-emerald-400">4 人在线</span>,
				width: 240,
			};
		default:
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium">
						{renderPluginIcon(manifest.icon, 13, manifest.accentColor)}
						<span className="truncate">{manifest.name}</span>
					</div>
				),
				right: <span className="text-[11px] text-white/50">运行中</span>,
				width: 240,
			};
	}
}

function GenericPluginWidget({ plugin }: { plugin: InstalledPlugin }) {
	const { manifest, customSettings } = plugin;
	return (
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
				<p className="text-xs text-text-muted">插件正常加载运行</p>
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
	);
}

/**
 * Creates an `IslandModule` wrapper from an installed community plugin.
 */
export function createPluginModule(plugin: InstalledPlugin): IslandModule {
	const { manifest } = plugin;
	const icon = renderPluginIcon(manifest.icon, 14, manifest.accentColor);

	return {
		id: manifest.id,
		title: manifest.name as unknown as MessageKey,
		settingsIcon: renderPluginIcon(manifest.icon, 14),
		enabledByDefault: true,
		useView(): ModuleView {
			return {
				active: false,
				priority: 10,
				icon,
				accent: manifest.accentColor ?? "#818cf8",
				compact: renderPluginCompact(plugin),
				expanded: renderPluginWidget(plugin),
				expandedSize: { width: 560, height: 190 },
			};
		},
	};
}
