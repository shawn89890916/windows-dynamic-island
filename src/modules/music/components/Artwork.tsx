import { MusicIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

/** Album art that cross-fades (zoom + blur) whenever the track changes. */
export function Artwork({
	src,
	size,
	radius,
	trackKey,
	glow,
}: {
	src: string | null | undefined;
	size: number;
	radius: number;
	trackKey?: string;
	glow?: string;
}) {
	return (
		<div
			className="relative flex-none overflow-hidden bg-[#1c1c1f] transition-shadow duration-600 ease-[ease]"
			style={{
				width: size,
				height: size,
				borderRadius: radius,
				boxShadow: glow ? `0 10px 40px -6px ${glow}88` : undefined,
			}}
		>
			<AnimatePresence initial={false}>
				<motion.div
					key={trackKey ?? src ?? "none"}
					className="absolute inset-0 grid place-items-center text-text-dim"
					initial={{ opacity: 0, scale: 1.25, filter: "blur(6px)" }}
					animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.45, ease: [0.2, 0.9, 0.3, 1] }}
				>
					{src ? <ArtworkImage key={src} src={src} size={size} /> : <MusicIcon size={size * 0.5} />}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

function ArtworkImage({ src, size }: { src: string; size: number }) {
	const [loaded, setLoaded] = useState(false);
	return (
		<>
			{!loaded && <MusicIcon size={size * 0.5} />}
			<img
				src={src}
				alt=""
				draggable={false}
				className="absolute inset-0 size-full object-cover"
				style={{ opacity: loaded ? 1 : 0 }}
				onLoad={() => setLoaded(true)}
				onError={() => setLoaded(false)}
			/>
		</>
	);
}
