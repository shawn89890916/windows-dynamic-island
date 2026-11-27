import type { SkinProps } from "./shared";
import { CapsuleEdges, EdgeParticles, FestiveSvg } from "./shared";

export function NewYearSkin({ layout, settings, daysToNewYear }: SkinProps) {
	const main = layout.main;
	const festiveFill = settings.backgroundMode === "festive" ? "rgba(93, 62, 22, 0.2)" : "transparent";
	const progress = Math.max(0.015, Math.min(1, daysToNewYear / 365));
	const particles = Math.max(0, Math.min(36, Number(settings.particleCount ?? 14)));
	return (
		<FestiveSvg
			layout={layout}
			speed={Number(settings.animationSpeed ?? 1)}
			className={settings.effects === false ? "festive-static" : "festive-effects"}
		>
			<title>距离元旦还有 {daysToNewYear} 天</title>
			<CapsuleEdges layout={layout} stroke="#E7C66E" fill={festiveFill} glow />
			<path
				d={`M ${main.x + 16} ${main.y + main.height - 1} H ${main.x + main.width - 16}`}
				pathLength="1"
				stroke="#F5D885"
				strokeWidth="2"
				strokeLinecap="round"
				strokeDasharray={`${progress} 1`}
				vectorEffect="non-scaling-stroke"
			/>
			{settings.decorations !== false && settings.showConfetti !== false && (
				<g strokeLinecap="round" opacity="0.88">
					<path d={`M ${main.x + 10} ${main.y + 8} l 4 2`} stroke="#F4D777" strokeWidth="1.4" />
					<path d={`M ${main.x + main.width - 15} ${main.y + 8} l 4 -3`} stroke="#F3A96D" strokeWidth="1.4" />
					<path d={`M ${main.x + 18} ${main.y + main.height - 8} l 3 -3`} stroke="#E7C66E" strokeWidth="1.4" />
					<path
						d={`M ${main.x + main.width - 24} ${main.y + main.height - 8} l -2 -4`}
						stroke="#E8A8A8"
						strokeWidth="1.4"
					/>
					<path d={`M ${main.x + 6} ${main.y + main.height / 2} v 3`} stroke="#F5D885" strokeWidth="1.2" />
				</g>
			)}
			{settings.effects !== false && settings.decorations !== false && settings.showConfetti !== false && (
				<EdgeParticles layout={layout} count={Math.min(20, particles)} color="#F2D482" />
			)}
		</FestiveSvg>
	);
}
