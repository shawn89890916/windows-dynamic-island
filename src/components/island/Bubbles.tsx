import { AnimatePresence, motion, type Transition } from "motion/react";
import type { ReactNode } from "react";
import { tv } from "tailwind-variants";
import { useT } from "../../core/i18n";
import type { ModuleEntry } from "../../core/types";
import { SEPARATED_NOTCH_WIDTH, SEPARATED_OVERFLOW_WIDTH, SEPARATED_PILL_WIDTH } from "./geometry";

interface BubbleProps {
	transition: Transition;
	/** The rim drawn around each bubble (Windows Island style). */
	rim: ReactNode;
	onOpen: (moduleId: string) => void;
}

/** Modules with an `ambient` glyph, as bubbles left of the island. */
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

/** Additional active modules and the optional status ring, beside the island. */
export function SideBubbles({
	entries,
	separated = false,
	notchStyle = false,
	overflowCount = 0,
	overflowId,
	status,
	statusId,
	statusLabel,
	offset,
	...props
}: BubbleProps & {
	entries: ModuleEntry[];
	separated?: boolean;
	notchStyle?: boolean;
	overflowCount?: number;
	overflowId?: string;
	status: ReactNode;
	statusId: string;
	statusLabel: string;
	offset: number;
}) {
	const t = useT();
	return (
		<div
			className="pointer-events-none absolute top-[max(0px,calc((100%-38px)/2))] flex gap-2"
			data-island-side-bubbles
			style={{ left: `calc(100% + ${offset}px)`, ...(notchStyle ? { top: 0 } : undefined) }}
		>
			<AnimatePresence>
				{entries.map((entry) => (
					<Bubble
						key={entry.module.id}
						id={entry.module.id}
						label={t(entry.module.title)}
						side
						separated={separated}
						notchStyle={notchStyle}
						from={-40}
						layout
						{...props}
					>
						{separated ? (
							<>
								<span className="grid size-5 shrink-0 place-items-center overflow-hidden">
									{entry.view.compact?.icon ?? entry.view.icon}
								</span>
								<span className="min-w-0 flex-1 truncate text-left text-[11px] leading-none">
									{t(entry.module.title)}
								</span>
							</>
						) : (
							(entry.view.compact?.icon ?? entry.view.icon)
						)}
					</Bubble>
				))}
				{separated && overflowCount > 0 && overflowId && (
					<Bubble
						key="overflow"
						id={overflowId}
						label={t("settings.mainTaskCount.overflow", { count: overflowCount })}
						side
						separated
						notchStyle={notchStyle}
						overflowBubble
						from={-40}
						layout
						{...props}
					>
						<span className="text-xs font-semibold">+{overflowCount}</span>
					</Bubble>
				)}
				{status && (
					<Bubble key={statusId} id={statusId} label={statusLabel} side statusBubble from={-40} layout {...props}>
						{status}
					</Bubble>
				)}
			</AnimatePresence>
		</div>
	);
}

const bubble = tv({
	base: "absolute top-0 left-[calc(100%+10px)] grid size-9.5 place-items-center rounded-full bg-black shadow-[0_12px_28px_-10px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] cursor-pointer select-none",
	variants: {
		ambient: { true: "pointer-events-auto relative left-auto flex-none origin-top" },
		side: { true: "pointer-events-auto relative top-auto left-auto flex-none origin-top" },
		statusBubble: {
			true: "size-8 bg-black/75 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.8)] ring-1 ring-white/5",
		},
		separated: {
			true: "z-10 flex h-9.5 w-[136px] min-w-0 items-center gap-2 overflow-hidden bg-black/90 px-2.5 text-white ring-1 ring-white/10",
		},
		notchStyle: { true: "h-8 w-[124px] rounded-t-none rounded-b-2xl pt-0.5" },
		overflowBubble: { true: "w-[38px] flex-none justify-center rounded-full px-0" },
		clickOnly: { true: "pointer-events-none cursor-default" },
	},
});

function Bubble({
	id,
	label,
	clickOnly,
	ambient,
	side,
	statusBubble,
	separated,
	notchStyle,
	overflowBubble,
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
	side?: boolean;
	statusBubble?: boolean;
	separated?: boolean;
	notchStyle?: boolean;
	overflowBubble?: boolean;
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
			className={bubble({ ambient, side, statusBubble, separated, notchStyle, overflowBubble, clickOnly })}
			data-island-secondary-bubble={(!ambient && !clickOnly) || undefined}
			data-hit-module={!ambient && !clickOnly ? id : undefined}
			data-hit={!clickOnly || undefined}
			style={
				separated
					? {
							width: overflowBubble
								? SEPARATED_OVERFLOW_WIDTH
								: notchStyle
									? SEPARATED_NOTCH_WIDTH
									: SEPARATED_PILL_WIDTH,
							height: notchStyle ? 32 : 38,
						}
					: undefined
			}
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
				if (!clickOnly) onOpen(id);
			}}
		>
			{children}
			{rim}
		</motion.button>
	);
}
