import type { CSSProperties, ReactNode } from "react";
import type { IslandOverlayLayout, IslandOverlayRect } from "../../types";

export interface SkinProps {
	layout: IslandOverlayLayout;
	settings: Record<string, unknown>;
	zodiac: string;
	daysToNewYear: number;
}

export function FestiveSvg({
	layout,
	children,
	className = "",
	speed = 1,
}: {
	layout: IslandOverlayLayout;
	children: ReactNode;
	className?: string;
	speed?: number;
}) {
	const safeSpeed = Number.isFinite(speed) ? Math.max(0.5, Math.min(2, speed)) : 1;
	return (
		<svg
			aria-hidden="true"
			className={`pointer-events-none absolute inset-0 overflow-visible ${className}`}
			viewBox={`0 0 ${Math.max(1, layout.groupWidth)} ${Math.max(1, layout.groupHeight)}`}
			preserveAspectRatio="none"
			style={{ "--festive-speed": safeSpeed } as CSSProperties}
		>
			{children}
		</svg>
	);
}

export function capsulePath(rect: IslandOverlayRect) {
	const { x, y, width: w, height: h } = rect;
	if (rect.shape === "circle")
		return `M ${x + w / 2} ${y} A ${w / 2} ${h / 2} 0 1 0 ${x + w / 2} ${y + h} A ${w / 2} ${h / 2} 0 1 0 ${x + w / 2} ${y} Z`;
	if (rect.shape === "notch") {
		const r = Math.min(16, h / 2, w / 3);
		return `M ${x} ${y} H ${x + w} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} Z`;
	}
	const r = Math.min(h / 2, w / 2);
	return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}

export function CapsuleEdges({
	layout,
	stroke,
	fill = "transparent",
	glow = false,
}: {
	layout: IslandOverlayLayout;
	stroke: string;
	fill?: string;
	glow?: boolean;
}) {
	return (
		<g>
			{[layout.main, ...layout.side].map((rect) => (
				<path
					key={`${rect.role}-${rect.x}-${rect.y}`}
					d={capsulePath(rect)}
					fill={fill}
					stroke={stroke}
					strokeWidth={glow ? 1.4 : 1}
					vectorEffect="non-scaling-stroke"
					className={glow ? "festive-glow" : undefined}
				/>
			))}
		</g>
	);
}

export function EdgeParticles({ layout, count, color }: { layout: IslandOverlayLayout; count: number; color: string }) {
	const rects = [layout.main, ...layout.side];
	const points = rects.flatMap((rect, rectIndex) => {
		const perRect = Math.ceil(count / rects.length);
		return Array.from({ length: perRect }, (_, index) => {
			const along = (index + 1) / (perRect + 1);
			const edge = index % (rect.shape === "notch" ? 3 : 4);
			const inset = Math.max(4, Math.min(10, rect.height * 0.2));
			const x =
				edge < 2
					? rect.x + inset + along * Math.max(0, rect.width - inset * 2)
					: rect.x + (edge === 2 ? 2 : rect.width - 2);
			const y = edge === 0 ? rect.y + 2 : edge === 1 || edge === 2 ? rect.y + rect.height - 2 : rect.y + 2;
			return {
				key: `${rectIndex}-${index}`,
				x,
				y,
				delay: -((index * 0.41 + rectIndex * 0.73) % 3.6),
				radius: 0.8 + (index % 3) * 0.45,
			};
		});
	});
	return (
		<g fill={color}>
			{points.slice(0, count).map((point) => (
				<circle
					key={point.key}
					cx={point.x}
					cy={point.y}
					r={point.radius}
					className="festive-particle"
					style={{ animationDelay: `${point.delay}s` }}
				/>
			))}
		</g>
	);
}

export function countdownDash(days: number) {
	const circumference = 2 * Math.PI * 18;
	const progress = Math.min(1, Math.max(0, days / 365));
	return `${(circumference * progress).toFixed(2)} ${(circumference * (1 - progress)).toFixed(2)}`;
}
