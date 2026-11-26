import type { CSSProperties } from "react";
import { tv } from "tailwind-variants";
import { type Appearance, rimBackground } from "../../core/appearance";
import { cn } from "../../core/cn";

/** A gradient ring masked to the border, inside the parent's rounded shape. */
const rim = tv({
	base: "pointer-events-none absolute inset-0 z-2 rounded-[inherit] bg-(image:--rim-bg) p-(--rim-w) [mask-image:linear-gradient(#000_0_0),linear-gradient(#000_0_0)] [mask-clip:content-box,border-box] [mask-composite:exclude]",
	variants: {
		classic: { true: "bg-white/9" },
		animated: { true: "animate-rim-spin" },
	},
});

/** The ring itself: a gradient `background`, or a faint hairline without one. */
export function RimRing({
	background,
	width,
	animate,
	openTop,
	notchDepth,
	backgroundSize,
	backgroundPosition,
}: {
	background: string | undefined;
	width: number;
	animate?: boolean;
	openTop?: boolean;
	notchDepth?: number;
	backgroundSize?: string;
	backgroundPosition?: string;
}) {
	return (
		<span
			className={rim({ classic: !background, animated: !!background && animate })}
			style={
				{
					"--rim-bg": background,
					"--rim-w": `${width}px`,
					backgroundSize,
					backgroundPosition,
					clipPath: openTop
						? notchDepth
							? `polygon(0 ${notchDepth}px, 0 100%, 100% 100%, 100% ${notchDepth}px)`
							: "polygon(0 0, var(--rim-w) 0, var(--rim-w) var(--rim-w), calc(100% - var(--rim-w)) var(--rim-w), calc(100% - var(--rim-w)) 0, 100% 0, 100% 100%, 0 100%)"
						: undefined,
				} as CSSProperties
			}
		/>
	);
}

/** A colored rim, with the top edge open for the Dynamic Island notch. */
export function Rim({
	look,
	openTop = false,
	notchDepth,
	backgroundSize,
	backgroundPosition,
}: {
	look: Appearance;
	openTop?: boolean;
	notchDepth?: number;
	backgroundSize?: string;
	backgroundPosition?: string;
}) {
	const background = rimBackground(look.rim);
	return (
		<RimRing
			background={background}
			width={background ? look.thickness : 1}
			animate={look.animate}
			openTop={openTop}
			notchDepth={notchDepth}
			backgroundSize={backgroundSize}
			backgroundPosition={backgroundPosition}
		/>
	);
}

/** A short arc that connects the island's rim to each concave notch corner. */
export function NotchRimArc({
	look,
	side,
	backgroundSize,
	backgroundPosition,
}: {
	look: Appearance;
	side: "left" | "right";
	backgroundSize?: string;
	backgroundPosition?: string;
}) {
	const background = rimBackground(look.rim);
	const width = background ? look.thickness : 1;
	const anchor = side === "left" ? "0% 100%" : "100% 100%";
	const mask = `radial-gradient(ellipse farthest-side at ${anchor}, transparent calc(99% - ${width}px), #000 99%, transparent calc(99% + ${width}px))`;

	return (
		<span
			className={cn(
				"pointer-events-none absolute inset-0",
				background ? "bg-(image:--rim-bg)" : "bg-white/9",
				background && look.animate && "animate-rim-spin",
			)}
			style={
				{
					"--rim-bg": background,
					backgroundSize,
					backgroundPosition,
					maskImage: mask,
					WebkitMaskImage: mask,
				} as CSSProperties
			}
		/>
	);
}

/** A glow in the rim's middle color, when turned on. */
export function glowStyle(look: Appearance): CSSProperties | undefined {
	if (!look.glow || !look.rim.length) return undefined;
	const color = look.rim[Math.floor(look.rim.length / 2)];
	return { boxShadow: `0 0 20px -2px ${color}bb, 0 14px 34px -14px rgba(0, 0, 0, 0.7)` };
}
