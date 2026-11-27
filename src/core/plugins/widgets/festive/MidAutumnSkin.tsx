import type { SkinProps } from "./shared";
import { CapsuleEdges, EdgeParticles, FestiveSvg } from "./shared";

export function MidAutumnSkin({ layout, settings }: SkinProps) {
	const main = layout.main;
	const festiveFill = settings.backgroundMode === "festive" ? "rgba(20, 40, 78, 0.25)" : "transparent";
	const particles = Math.max(0, Math.min(36, Number(settings.particleCount ?? 14)));
	return (
		<FestiveSvg
			layout={layout}
			speed={Number(settings.animationSpeed ?? 1)}
			className={settings.effects === false ? "festive-static" : "festive-effects"}
		>
			<CapsuleEdges layout={layout} stroke="#DDBD73" fill={festiveFill} glow />
			{settings.decorations !== false && settings.showMoon !== false && (
				<g transform={`translate(${main.x + main.width - 16} ${main.y + 12})`}>
					<path d="M 1 -7 A 8 8 0 1 0 6 6 A 6 6 0 0 1 1 -7 Z" fill="#EEDDA8" />
					<path d="M -8 8 l 0 4 M -10 10 h 4" stroke="#D8C17F" strokeWidth="0.9" strokeLinecap="round" />
					<circle cx="-13" cy="-5" r="1" fill="#EEDDA8" />
				</g>
			)}
			{settings.decorations !== false && settings.showRabbit !== false && (
				<g transform={`translate(${main.x + 15} ${main.y + main.height - 5})`} fill="#E3D6AF" opacity="0.9">
					<ellipse cx="0" cy="0" rx="4.2" ry="2.5" />
					<circle cx="4" cy="-2.1" r="2.2" />
					<path d="M 3 -3 Q 1 -11 3 -12 Q 5 -12 5 -4 M 5 -4 Q 6 -12 8 -11 Q 9 -9 6 -3" />
					<circle cx="5" cy="-2.5" r="0.35" fill="#283652" />
				</g>
			)}
			{settings.effects !== false && settings.decorations !== false && settings.showStars !== false && (
				<EdgeParticles layout={layout} count={Math.min(16, particles)} color="#E6D59A" />
			)}
		</FestiveSvg>
	);
}
