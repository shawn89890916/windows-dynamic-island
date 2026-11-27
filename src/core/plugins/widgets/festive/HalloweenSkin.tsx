import type { SkinProps } from "./shared";
import { CapsuleEdges, EdgeParticles, FestiveSvg } from "./shared";

export function HalloweenSkin({ layout, settings }: SkinProps) {
	const main = layout.main;
	const festiveFill = settings.backgroundMode === "festive" ? "rgba(63, 32, 86, 0.23)" : "transparent";
	const particles = Math.max(0, Math.min(36, Number(settings.particleCount ?? 14)));
	return (
		<FestiveSvg
			layout={layout}
			speed={Number(settings.animationSpeed ?? 1)}
			className={settings.effects === false ? "festive-static" : "festive-effects"}
		>
			<CapsuleEdges layout={layout} stroke="#A78BDF" fill={festiveFill} glow />
			{settings.decorations !== false && settings.showGhost !== false && (
				<g transform={`translate(${main.x + 8} ${main.y + 4})`} opacity="0.85">
					<path d="M 1 10 V 5 A 5 5 0 0 1 11 5 V 11 L 9 9 L 7 11 L 5 9 L 3 11 Z" fill="#E8E0F2" />
					<circle cx="4.5" cy="5" r="0.7" fill="#392B55" />
					<circle cx="8" cy="5" r="0.7" fill="#392B55" />
				</g>
			)}
			{settings.decorations !== false && settings.showPumpkin !== false && (
				<g transform={`translate(${main.x + main.width - 17} ${main.y + main.height - 8})`}>
					<path
						d="M 0 2 Q 0 -3 4 -4 Q 8 -3 8 2 Q 8 7 4 7 Q 0 7 0 2 Z"
						fill="#E58544"
						stroke="#F2BC73"
						strokeWidth="0.8"
					/>
					<path d="M 4 -4 l 1 -2 M 2 0 l 1 1 M 6 0 l -1 1" stroke="#51325C" strokeWidth="0.9" strokeLinecap="round" />
				</g>
			)}
			{settings.effects !== false && settings.decorations !== false && (
				<EdgeParticles layout={layout} count={Math.min(16, particles)} color="#E9A35E" />
			)}
		</FestiveSvg>
	);
}
