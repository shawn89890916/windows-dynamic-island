import { AnimatePresence, motion, type Transition } from "motion/react";
import type { ReactNode } from "react";
import type { ModuleEntry } from "../../core/types";

interface BubbleProps {
	transition: Transition;
	/** The rim drawn around each bubble (Windows Island style). */
	rim: ReactNode;
	onOpen: (moduleId: string) => void;
}

/** Modules with an `ambient` glyph, as bubbles left of the resting island. */
export function AmbientBubbles({
	entries,
	visible,
	shrunk,
	...bubble
}: BubbleProps & { entries: ModuleEntry[]; visible: boolean; shrunk: boolean }) {
	return (
		<div
			data-island-ambient-bubbles
			className="pointer-events-none absolute top-0 right-[calc(100%+10px)] flex flex-row-reverse gap-2"
		>
			<AnimatePresence>
				{visible &&
					entries
						.filter((e) => e.view.ambient)
						.map(({ module, view }) => (
							<Bubble key={module.id} id={module.id} scale={shrunk ? 0.84 : 1} {...bubble}>
								{view.ambient}
							</Bubble>
						))}
			</AnimatePresence>
		</div>
	);
}

function Bubble({
	id,
	scale,
	transition,
	rim,
	onOpen,
	children,
}: BubbleProps & {
	id: string;
	scale: number;
	children: ReactNode;
}) {
	return (
		<motion.button
			className="pointer-events-auto relative grid size-9.5 flex-none origin-top cursor-pointer select-none place-items-center rounded-full bg-black shadow-[0_12px_28px_-10px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)]"
			data-hit
			layout
			initial={{ opacity: 0, scale: 0.3, x: 40 }}
			animate={{ opacity: 1, scale, x: 0 }}
			exit={{ opacity: 0, scale: 0.3, x: 40 }}
			transition={transition}
			whileHover={{ scale: scale * 1.14, transition: { type: "spring", stiffness: 450, damping: 25 } }}
			whileTap={{ scale: scale * 0.94 }}
			onMouseEnter={() => {
				onOpen(id);
			}}
			onClick={(e) => {
				e.stopPropagation();
				onOpen(id);
			}}
		>
			{children}
			{rim}
		</motion.button>
	);
}
