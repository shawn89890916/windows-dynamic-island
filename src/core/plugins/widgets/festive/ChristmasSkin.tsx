import type { SkinProps } from "./shared";
import { CapsuleEdges, EdgeParticles, FestiveSvg } from "./shared";

export function ChristmasSkin({ layout, settings }: SkinProps) {
	const main = layout.main;
	const snow = settings.decorations !== false && settings.showSnow !== false;
	const lights = settings.decorations !== false && settings.showLights !== false;
	const particles = Math.max(0, Math.min(36, Number(settings.particleCount ?? 14)));
	const festiveFill = settings.backgroundMode === "festive" ? "rgba(20, 66, 45, 0.22)" : "transparent";
	return (
		<FestiveSvg
			layout={layout}
			speed={Number(settings.animationSpeed ?? 1)}
			className={settings.effects === false ? "festive-static" : "festive-effects"}
		>
			<CapsuleEdges layout={layout} stroke="#9BD8B6" fill={festiveFill} glow />
			{snow && (
				<g fill="#F4FAFF" opacity="0.8">
					<circle cx={main.x + 6} cy={main.y + 5} r="1.2" />
					<circle cx={main.x + main.width - 6} cy={main.y + main.height - 5} r="1.2" />
					<path
						d={`M ${main.x + 12} ${main.y + main.height - 2} q 5 -3 10 0 t 10 0`}
						fill="none"
						stroke="#F4FAFF"
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</g>
			)}
			{settings.decorations !== false && settings.showHat !== false && (
				<g transform={`translate(${main.x + 7} ${main.y + 1})`}>
					<path d="M 1 8 C 3 2 9 0 13 2 L 11 9 Z" fill="#C94B4B" />
					<path d="M 1 8 Q 6 7 12 9 L 12 11 Q 6 9 1 11 Z" fill="#F2F0E8" />
					<circle cx="13" cy="2" r="1.5" fill="#F4F1E9" />
				</g>
			)}
			{lights && (
				<g className="festive-twinkle">
					<circle cx={main.x + 22} cy={main.y + main.height - 2} r="1.4" fill="#E6655D" />
					<circle cx={main.x + 30} cy={main.y + main.height - 2} r="1.4" fill="#E5C46B" />
					<circle cx={main.x + 38} cy={main.y + main.height - 2} r="1.4" fill="#66BA86" />
				</g>
			)}
			{settings.effects !== false && snow && <EdgeParticles layout={layout} count={particles} color="#EAF7FF" />}
		</FestiveSvg>
	);
}
