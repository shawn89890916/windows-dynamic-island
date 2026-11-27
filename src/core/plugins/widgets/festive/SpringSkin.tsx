import type { SkinProps } from "./shared";
import { CapsuleEdges, EdgeParticles, FestiveSvg } from "./shared";

export function SpringSkin({ layout, settings, zodiac }: SkinProps) {
	const main = layout.main;
	const decorations = settings.decorations !== false;
	const festiveFill = settings.backgroundMode === "festive" ? "rgba(117, 21, 29, 0.22)" : "transparent";
	const particles = Math.max(0, Math.min(36, Number(settings.particleCount ?? 14)));
	return (
		<FestiveSvg
			layout={layout}
			speed={Number(settings.animationSpeed ?? 1)}
			className={settings.effects === false ? "festive-static" : "festive-effects"}
		>
			<CapsuleEdges layout={layout} stroke="#E9C778" fill={festiveFill} glow />
			{decorations && settings.showClouds !== false && (
				<g fill="none" stroke="#E9C778" strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
					<path d={`M ${main.x + 12} ${main.y + main.height - 6} c 3 -4 8 -4 10 0 c 2 -3 6 -3 8 0`} />
					<path d={`M ${main.x + main.width - 30} ${main.y + 6} c 3 -4 8 -4 10 0 c 2 -3 6 -3 8 0`} />
				</g>
			)}
			{decorations && settings.showClouds !== false && (
				<g transform={`translate(${main.x + main.width - 18} ${main.y + main.height - 14})`}>
					<path d="M 5 0 v 3 M 1 3 h 8 v 7 q -4 4 -8 0 Z" fill="#A93337" stroke="#E9C778" strokeWidth="0.8" />
					<path d="M 5 4 v 7" stroke="#E9C778" strokeWidth="0.6" />
				</g>
			)}
			{decorations && settings.showZodiac !== false && (
				<g transform={`translate(${main.x + 13} ${main.y + 11})`}>
					<circle r="7" fill="#A93337" stroke="#E9C778" strokeWidth="1" />
					<text y="2.7" textAnchor="middle" fontSize="8" fontWeight="600" fill="#F6DEA1">
						{zodiac}
					</text>
				</g>
			)}
			{settings.effects !== false && decorations && settings.showClouds !== false && (
				<EdgeParticles layout={layout} count={Math.min(18, particles)} color="#F4D98E" />
			)}
		</FestiveSvg>
	);
}
