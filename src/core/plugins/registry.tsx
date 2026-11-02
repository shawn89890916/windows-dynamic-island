import {
	CloudSunIcon,
	CoffeeIcon,
	Gamepad2Icon,
	PuzzleIcon,
	SlidersIcon,
	StickyNoteIcon,
	TimerIcon,
	TrendingUpIcon,
} from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import { command } from "../bridge";
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
	const { manifest } = plugin;
	return (
		<div className="flex h-full items-center justify-between px-2 select-none">
			{/* Leading: Icon & Name */}
			<div className="flex min-w-0 items-center gap-3">
				<div
					className="flex size-11 flex-none items-center justify-center rounded-2xl bg-white/10"
					style={{ color: manifest.accentColor }}
				>
					{renderPluginIcon(manifest.icon, 20)}
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-1.5">
						<span className="text-[13px] font-semibold text-text truncate">{manifest.name}</span>
						<span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-text-faint">
							v{manifest.version}
						</span>
					</div>
					<span className="mt-0.5 truncate text-[11px] text-text-faint max-w-[200px]">{manifest.description}</span>
				</div>
			</div>

			{/* Center: Live Status & Author */}
			<div className="flex flex-col items-center justify-center px-4">
				<div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
					<span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
					<span>实时微应用已就绪</span>
				</div>
				<span className="mt-1 text-[10px] text-text-faint">
					作者：{manifest.author.name} · {plugin.source === "marketplace" ? "官方市场" : "社区扩展"}
				</span>
			</div>

			{/* Trailing: Open Settings Action */}
			<div className="flex flex-none items-center gap-2">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						command("open_settings");
					}}
					className="flex h-8.5 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-xs font-semibold text-text hover:bg-white/18 active:scale-95"
				>
					<SlidersIcon size={12} className="opacity-70" />
					<span>配置插件</span>
				</button>
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
				expandedSize: { width: 560, height: 130 },
			};
		},
	};
}
