import { MusicIcon } from "lucide-react";
/**
 * Music module — Spotify and any other player exposed through the Windows
 * media controls (browsers, Apple Music, VLC…). Everything music-related lives
 * in this folder; its backend counterpart is `src-tauri/src/providers/music/`.
 */
import { macAppearanceEnabled } from "../../core/plugins/appearancePlugin";
import { useInstalledPlugins } from "../../core/plugins/registry";
import { useSetting } from "../../core/settings";
import type { IslandModule, ModuleView } from "../../core/types";
import { Artwork } from "./components/Artwork";
import { MusicCompactLeft, MusicCompactRight, MusicCover, MusicWaveform } from "./components/MusicCompact";
import { MusicPanel } from "./components/MusicPanel";
import { SpotifySettings } from "./components/SpotifySettings";
import { useAccentColor } from "./hooks/useAccentColor";
import { useMusic } from "./hooks/useMusic";
import { musicSettings } from "./settings";

export const musicModule: IslandModule = {
	id: "music",
	title: "music.title",
	settingsIcon: <MusicIcon size={15} />,
	settings: Object.values(musicSettings),
	SettingsSection: SpotifySettings,
	useView(): ModuleView {
		const { music, active } = useMusic();
		const macCompact = macAppearanceEnabled(useInstalledPlugins());
		const accent = useAccentColor(music?.thumbnail);
		const autoExpand = useSetting(musicSettings.autoExpand);
		const showVisualizer = useSetting(musicSettings.visualizer);

		return {
			active,
			priority: music?.playing ? 50 : 10,
			icon: <Artwork src={music?.thumbnail} size={22} radius={11} />,
			compact: music && {
				left: macCompact ? <MusicCover music={music} /> : <MusicCompactLeft music={music} />,
				right: macCompact ? (
					<MusicWaveform music={music} accent={accent} showVisualizer={showVisualizer} />
				) : (
					<MusicCompactRight music={music} accent={accent} showVisualizer={showVisualizer} />
				),
				width: 340,
			},
			expanded: <MusicPanel music={music} accent={accent} showVisualizer={showVisualizer} />,
			expandedSize: { width: 560, height: 176 },
			activityKey: autoExpand && music?.playing ? `${music.title}|${music.artist}` : undefined,
		};
	},
};
