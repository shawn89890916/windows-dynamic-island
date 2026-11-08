import { AnimatePresence, motion, type Transition } from "motion/react";
import type { ReactNode } from "react";
import type { Appearance } from "../../core/appearance";
import { cn } from "../../core/cn";
import { cornerRadius, type Geo } from "./geometry";
import { glowStyle } from "./Rim";

/** The island's black body; its content blurs out and in whenever `contentKey` changes. */
export function Surface({
	g,
	big,
	look,
	transition,
	contentKey,
	contentTop = 0,
	macCompact = false,
	macCompactInline = false,
	rim,
	children,
}: {
	g: Geo;
	big: boolean;
	look: Appearance;
	transition: Transition;
	contentKey: string;
	contentTop?: number;
	macCompact?: boolean;
	macCompactInline?: boolean;
	rim: ReactNode;
	children: ReactNode;
}) {
	const windows = look.style === "windows";
	return (
		<motion.div
			data-island-surface
			className={cn(
				cn(
					"absolute inset-0 overflow-hidden shadow-[0_16px_40px_-10px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow duration-400 ease-[ease]",
					look.blurEffect === "none"
						? "bg-black"
						: look.blurEffect === "subtle"
							? "bg-black/85"
							: look.blurEffect === "moderate"
								? "bg-black/72"
								: "bg-black/60",
				),
				big &&
					!macCompact &&
					"shadow-[0_28px_80px_-12px_rgba(0,0,0,0.95),0_10px_32px_-4px_rgba(0,0,0,0.6),inset_0_1px_1px_0_rgba(255,255,255,0.14),0_0_0_1px_rgba(255,255,255,0.1)]",
			)}
			style={windows ? glowStyle(look) : undefined}
			initial={false}
			animate={cornerRadius(g, windows)}
			transition={transition}
		>
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.div
					key={contentKey}
					data-mac-compact-content={macCompactInline || undefined}
					className={cn("absolute top-0 origin-top", macCompactInline ? "left-1/2 ml-1" : "left-1/2 -translate-x-1/2")}
					style={{
						top: contentTop,
						width: macCompactInline ? Math.max(0, g.width / 2 - 4) : g.width,
						height: g.height - contentTop,
					}}
					initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
					animate={{
						opacity: 1,
						scale: 1,
						filter: "blur(0px)",
						transition: { duration: 0.32, delay: 0.06, ease: [0.2, 0.9, 0.3, 1] },
					}}
					exit={{
						opacity: 0,
						scale: 0.94,
						filter: "blur(8px)",
						transition: { duration: 0.16, ease: "easeIn" },
					}}
				>
					{children}
				</motion.div>
			</AnimatePresence>
			{rim}
		</motion.div>
	);
}
