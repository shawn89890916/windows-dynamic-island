import { AudioLinesIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Marquee } from "../../../components/Marquee";
import { cn } from "../../../core/cn";
import { formatTime, type MusicState, useLivePosition } from "../hooks/useMusic";
import { Artwork } from "./Artwork";
import { Visualizer } from "./Visualizer";

export function MusicCover({ music }: { music: MusicState }) {
	return (
		<>
			<Artwork src={music.thumbnail} size={20} radius={5} trackKey={music.title} />
			<span className="sr-only">{[music.title, music.artist].filter(Boolean).join(" · ")}</span>
		</>
	);
}

export function MusicWaveform({
	music,
	accent,
	showVisualizer,
}: {
	music: MusicState;
	accent: string;
	showVisualizer: boolean;
}) {
	return showVisualizer ? (
		<Visualizer playing={music.playing} color={accent} height={15} barWidth={2} />
	) : (
		<AudioLinesIcon aria-hidden size={16} color={accent} />
	);
}

/** Left slot of the compact pill: artwork + title over a dimmed artist line. */
export function MusicCompactLeft({ music }: { music: MusicState }) {
	return (
		<>
			<Artwork src={music.thumbnail} size={24} radius={7} trackKey={music.title} />
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.div
					key={`${music.title}|${music.artist}`}
					className="flex max-w-47.5 min-w-0 flex-col"
					initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
					animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
					exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
					transition={{ duration: 0.25 }}
				>
					<Marquee text={music.title} className="text-[12.5px]/[1.25] font-semibold text-text" />
					{music.artist && <Marquee text={music.artist} className="text-[10.5px]/[1.25] font-medium text-text-dim" />}
				</motion.div>
			</AnimatePresence>
		</>
	);
}

/** Right slot: live playback position + optional visualizer. */
export function MusicCompactRight({
	music,
	accent,
	showVisualizer,
}: {
	music: MusicState;
	accent: string;
	showVisualizer: boolean;
}) {
	const position = useLivePosition(music);
	return (
		<>
			<span className={cn("text-[12px] font-semibold text-text-dim tabular-nums", !music.playing && "text-text-faint")}>
				{formatTime(position)}
			</span>
			{showVisualizer && <Visualizer playing={music.playing} color={accent} />}
		</>
	);
}
