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

/** One continuous rim path across the island body and both notch corners. */
export function AttachedNotchRim({
	look,
	width,
	height,
	ear,
	earHeight,
	radius,
	radiusY,
}: {
	look: Appearance;
	width: number;
	height: number;
	ear: number;
	earHeight: number;
	radius: number;
	radiusY: number;
}) {
	const background = rimBackground(look.rim);
	const stroke = background ? look.thickness : 1;
	const frameWidth = width + 2 * ear;
	const left = ear;
	const right = ear + width;
	const rx = Math.min(radius, width / 2);
	const ry = Math.min(radiusY, height / 2);
	const curve = 0.55228475;
	const path = [
		`M 0 0`,
		`C ${ear * curve} 0 ${left} ${earHeight * (1 - curve)} ${left} ${earHeight}`,
		`L ${left} ${height - ry}`,
		`A ${rx} ${ry} 0 0 0 ${left + rx} ${height}`,
		`L ${right - rx} ${height}`,
		`A ${rx} ${ry} 0 0 0 ${right} ${height - ry}`,
		`L ${right} ${earHeight}`,
		`C ${right} ${earHeight * (1 - curve)} ${right + ear * (1 - curve)} 0 ${frameWidth} 0`,
	].join(" ");
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frameWidth}" height="${height}" viewBox="0 0 ${frameWidth} ${height}"><path d="${path}" fill="none" stroke="white" stroke-width="${stroke}" stroke-linecap="butt" stroke-linejoin="round"/></svg>`;
	const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

	return (
		<span
			className={cn(
				"pointer-events-none absolute top-0 z-2",
				background ? "bg-(image:--rim-bg)" : "bg-white/9",
				background && look.animate && "animate-rim-spin",
			)}
			style={
				{
					"--rim-bg": background,
					left: -ear,
					width: frameWidth,
					height,
					maskImage: mask,
					WebkitMaskImage: mask,
					maskRepeat: "no-repeat",
					WebkitMaskRepeat: "no-repeat",
					maskSize: "100% 100%",
					WebkitMaskSize: "100% 100%",
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
