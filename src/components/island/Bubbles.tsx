import { AnimatePresence, motion, type Transition } from "motion/react";
import type { ReactNode } from "react";
import { useT } from "../../core/i18n";
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
	const t = useT();
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
							<Bubble
								key={module.id}
								id={module.id}
								label={t(module.title)}
								ambient
								from={40}
								scale={shrunk ? 0.84 : 1}
								layout
								{...bubble}
							>
								{view.ambient}
							</Bubble>
						))}
			</AnimatePresence>
		</div>
	);
}

/** Independent activities to the right of the main island. */
export function SideBubbles({
	entry,
	status,
	statusId,
	statusLabel,
	offset,
	...props
}: BubbleProps & {
	entry: ModuleEntry | undefined;
	status: ReactNode;
	statusId: string;
	statusLabel: string;
	offset: number;
}) {
	const t = useT();
	return (
		<div
			className="pointer-events-none absolute top-[max(0px,calc((100%-38px)/2))] flex gap-2"
			style={{ left: `calc(100% + ${offset}px)` }}
		>
			<AnimatePresence>
				{entry && (
					<Bubble key={entry.module.id} id={entry.module.id} label={t(entry.module.title)} from={-40} layout {...props}>
						{entry.view.icon}
					</Bubble>
				)}
				{status && (
					<Bubble key={statusId} id={statusId} label={statusLabel} from={-40} layout clickOnly {...props}>
						{status}
					</Bubble>
				)}
			</AnimatePresence>
		</div>
	);
}

function Bubble({
	id,
	label,
	clickOnly,
	ambient,
	from,
	scale = 1,
	layout,
	transition,
	rim,
	onOpen,
	children,
}: BubbleProps & {
	id: string;
	label: string;
	clickOnly?: boolean;
	/** In the row of persistent bubbles, rather than placed right of the island. */
	ambient?: boolean;
	/** Horizontal offset it slides in from and out to. */
	from: number;
	scale?: number;
	layout?: boolean;
	children: ReactNode;
}) {
	return (
		<motion.button
			type="button"
			aria-label={label}
			title={label}
			data-no-drag
			className="pointer-events-auto relative grid size-9.5 flex-none origin-top cursor-pointer select-none place-items-center rounded-full bg-black shadow-[0_12px_28px_-10px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)]"
			data-island-secondary-bubble={(!ambient && !clickOnly) || undefined}
			data-hit
			layout={layout}
			initial={{ opacity: 0, scale: 0.3, x: from }}
			animate={{ opacity: 1, scale, x: 0 }}
			exit={{ opacity: 0, scale: 0.3, x: from }}
			transition={transition}
			whileHover={{ scale: (scale ?? 1) * 1.14, transition: { type: "spring", stiffness: 450, damping: 25 } }}
			whileTap={{ scale: (scale ?? 1) * 0.94 }}
			onPointerEnter={clickOnly ? undefined : () => onOpen(id)}
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
