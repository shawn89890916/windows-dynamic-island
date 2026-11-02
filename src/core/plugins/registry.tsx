import {
	CloudSunIcon,
	CoffeeIcon,
	CompassIcon,
	Gamepad2Icon,
	MessageSquareIcon,
	PuzzleIcon,
	SearchIcon,
	ShieldCheckIcon,
	SlidersIcon,
	SparklesIcon,
	StickyNoteIcon,
	TimerIcon,
	TrendingUpIcon,
} from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import navopathLogo from "../../assets/navopath.png";
import { command } from "../bridge";
import { type MessageKey, type Translate, useT } from "../i18n";
import type { IslandModule, ModuleView } from "../types";
import { MARKETPLACE_CATALOG } from "./catalog";
import type { InstalledPlugin, PluginManifest } from "./types";
import { AiHubWidget } from "./widgets/AiHubWidget";
import { CryptoTickerWidget } from "./widgets/CryptoTickerWidget";
import { EverythingWidget } from "./widgets/EverythingWidget";
import { ImNotificationWidget, WeChatIcon } from "./widgets/ImNotificationWidget";
import { NavoPathWidget } from "./widgets/NavoPathWidget";
import { ObsidianIconSvg, ObsidianWidget } from "./widgets/ObsidianWidget";
import { PomodoroWidget } from "./widgets/PomodoroWidget";
import { QuickMemoWidget } from "./widgets/QuickMemoWidget";
import { SteamFriendsWidget } from "./widgets/SteamFriendsWidget";
import { VpnWidget } from "./widgets/VpnWidget";
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
		case "MessageSquare":
			return <MessageSquareIcon {...props} />;
		case "Search":
			return <SearchIcon {...props} />;
		case "Sparkles":
			return <SparklesIcon {...props} />;
		case "ShieldCheck":
			return <ShieldCheckIcon {...props} />;
		case "Compass":
			return <CompassIcon {...props} />;
		case "Obsidian":
			return <ObsidianIconSvg size={size} className={color ? "" : "text-purple-400"} />;
		case "NavoPath":
			return (
				<img
					src={navopathLogo}
					alt="NavoPath"
					style={{ width: size, height: size }}
					className="shrink-0 object-contain"
				/>
			);
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
						manifest: { ...item.manifest, ...catalogMatch },
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
		case "com.island.navopath":
			return <NavoPathWidget settings={plugin.customSettings} />;
		case "com.island.everything":
			return <EverythingWidget settings={plugin.customSettings} />;
		case "com.island.obsidian":
			return <ObsidianWidget settings={plugin.customSettings} />;
		case "com.island.ai-hub":
			return <AiHubWidget settings={plugin.customSettings} />;
		case "com.island.vpn":
			return <VpnWidget settings={plugin.customSettings} />;
		case "com.island.im-notifications":
			return <ImNotificationWidget settings={plugin.customSettings} />;
		default:
			return <GenericPluginWidget plugin={plugin} />;
	}
}

function renderPluginCompact(
	plugin: InstalledPlugin,
	t: Translate,
): { left: ReactNode; right: ReactNode; width?: number } {
	const { manifest } = plugin;
	const title = manifest.titleKey ? t(manifest.titleKey) : manifest.name;
	switch (manifest.id) {
		case "com.island.pomodoro":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
						<TimerIcon size={13} />
						<span>{title} 25:00</span>
					</div>
				),
				right: (
					<span className="rounded bg-red-500/15 px-1.5 py-0.2 text-[10px] text-red-400">
						{t("marketplace.widgets.pomodoro.running")}
					</span>
				),
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
						<span>{title}</span>
					</div>
				),
				right: <span className="text-[11px] text-emerald-400">{t("marketplace.widgets.workCountdown.chilling")}</span>,
				width: 250,
			};
		case "com.island.weather":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-sky-400">
						<CloudSunIcon size={13} />
						<span>22°C</span>
					</div>
				),
				right: <span className="text-[10px] text-emerald-400">AQI 32</span>,
				width: 220,
			};
		case "com.island.quick-memo":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
						<StickyNoteIcon size={13} />
						<span>{title}</span>
					</div>
				),
				right: <span className="text-[10px] text-text-faint">{t("marketplace.widgets.memo.pending", { n: 2 })}</span>,
				width: 230,
			};
		case "com.island.steam-friends":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-purple-400">
						<Gamepad2Icon size={13} />
						<span>{title}</span>
					</div>
				),
				right: (
					<span className="text-[10px] text-emerald-400">{t("marketplace.widgets.steam.inGameCount", { n: 2 })}</span>
				),
				width: 240,
			};
		case "com.island.navopath":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-orange-400">
						<img src={navopathLogo} alt="NavoPath" className="size-3.5 shrink-0 object-contain" />
						<span>{title}</span>
					</div>
				),
				right: (
					<span className="rounded bg-orange-500/15 px-1.5 py-0.2 text-[10px] font-medium text-orange-400">
						MCP Live
					</span>
				),
				width: 250,
			};
		case "com.island.everything":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
						<SearchIcon size={13} />
						<span>{title}</span>
					</div>
				),
				right: (
					<span className="rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-medium text-amber-400">
						Spotlight
					</span>
				),
				width: 250,
			};
		case "com.island.obsidian":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-purple-400">
						<ObsidianIconSvg size={13} />
						<span>{title}</span>
					</div>
				),
				right: (
					<span className="rounded bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-medium text-purple-300">Vault</span>
				),
				width: 250,
			};
		case "com.island.ai-hub":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-indigo-400">
						<SparklesIcon size={13} />
						<span>{title}</span>
					</div>
				),
				right: (
					<span className="rounded bg-indigo-500/15 px-1.5 py-0.2 text-[10px] font-medium text-indigo-300">
						4 Agents
					</span>
				),
				width: 250,
			};
		case "com.island.vpn":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-cyan-400">
						<ShieldCheckIcon size={13} />
						<span>UniClash</span>
					</div>
				),
				right: (
					<span className="rounded bg-cyan-500/15 px-1.5 py-0.2 text-[10px] font-medium text-cyan-300">
						127.0.0.1:8993
					</span>
				),
				width: 250,
			};
		case "com.island.im-notifications":
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium text-[#07C160]">
						<WeChatIcon size={13} />
						<span>{title}</span>
					</div>
				),
				right: (
					<span className="rounded bg-[#07C160]/15 px-1.5 py-0.2 text-[10px] font-medium text-[#07C160]">
						微信 · QQ
					</span>
				),
				width: 250,
			};
		default:
			return {
				left: (
					<div className="flex items-center gap-1.5 text-xs font-medium">
						{renderPluginIcon(manifest.icon, 13, manifest.accentColor)}
						<span className="truncate">{title}</span>
					</div>
				),
				right: <span className="text-[11px] text-white/50">{t("marketplace.widgets.generic.ready")}</span>,
				width: 240,
			};
	}
}

function GenericPluginWidget({ plugin }: { plugin: InstalledPlugin }) {
	const t = useT();
	const { manifest } = plugin;
	return (
		<div className="flex h-full flex-col justify-between px-3 py-1.5 select-none">
			{/* Top: Icon, Name & Action */}
			<div className="flex items-center justify-between border-b border-white/8 pb-2.5">
				<div className="flex items-center gap-3 min-w-0">
					<div
						className="flex size-9.5 shrink-0 items-center justify-center rounded-2xl bg-white/10"
						style={{ color: manifest.accentColor }}
					>
						{renderPluginIcon(manifest.icon, 20)}
					</div>
					<div className="flex min-w-0 flex-col">
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold text-text truncate">{manifest.name}</span>
							<span className="rounded-full bg-white/10 px-2 py-0.2 text-[10.5px] text-text-faint shrink-0">
								v{manifest.version}
							</span>
						</div>
						<p className="mt-0.5 truncate text-[11px] text-text-faint max-w-xs">{manifest.description}</p>
					</div>
				</div>

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						command("open_settings");
					}}
					className="flex h-8.5 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-xs font-semibold text-text transition-all hover:bg-white/18 active:scale-95 whitespace-nowrap ml-3"
				>
					<SlidersIcon size={12} className="opacity-70" />
					<span>{t("marketplace.widgets.generic.configure")}</span>
				</button>
			</div>

			{/* Bottom: Status Banner & Metadata */}
			<div className="flex items-center justify-between pt-2">
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
						<span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
						<span>{t("marketplace.widgets.generic.ready")}</span>
					</div>
					{manifest.tags && manifest.tags.length > 0 && (
						<div className="flex items-center gap-1">
							{manifest.tags.slice(0, 3).map((tag) => (
								<span key={tag} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-text-faint">
									#{tag}
								</span>
							))}
						</div>
					)}
				</div>

				<span className="text-[11px] text-text-faint whitespace-nowrap">
					{t("marketplace.widgets.generic.author", { author: manifest.author.name })} ·{" "}
					{plugin.source === "marketplace"
						? t("marketplace.widgets.generic.official")
						: t("marketplace.widgets.generic.community")}
				</span>
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
		title: (manifest.titleKey ?? manifest.name) as MessageKey,
		settingsIcon: renderPluginIcon(manifest.icon, 14),
		enabledByDefault: true,
		useView(): ModuleView {
			const t = useT();
			return {
				active: false,
				priority: 10,
				icon,
				accent: manifest.accentColor ?? "#818cf8",
				compact: renderPluginCompact(plugin, t),
				expanded: renderPluginWidget(plugin),
				expandedSize: manifest.expandedSize ?? { width: 580, height: 180 },
			};
		},
	};
}
