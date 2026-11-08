import { LayoutGridIcon, SettingsIcon } from "lucide-react";
import { LayoutGroup, motion, Reorder, type Transition, useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useId, useRef } from "react";
import { tv } from "tailwind-variants";
import { command } from "../../core/bridge";
import { useT } from "../../core/i18n";
import type { TabNavigationOptions } from "../../core/island";
import type { ModuleEntry } from "../../core/types";
import { LAUNCHER } from "../../core/useIslandController";

const tabs = tv({
	slots: {
		base: "mb-2.5 flex shrink-0 items-center gap-1 overflow-x-auto overflow-y-hidden no-scrollbar max-w-full",
		tab: "relative flex h-7.5 shrink-0 items-center gap-1.75 rounded-[15px] pr-3 pl-2 text-[13px] font-semibold text-text-dim whitespace-nowrap transition-colors duration-200 hover:text-text",
		pill: "absolute inset-0 rounded-[inherit] bg-white/10",
		part: "relative flex shrink-0 items-center justify-center whitespace-nowrap",
		dot: "relative size-1.25 shrink-0 rounded-full bg-ok",
		extra: "ml-auto flex shrink-0 items-center gap-1.5",
		gear: "grid size-7.5 shrink-0 place-items-center rounded-full text-text-faint transition-colors duration-200 hover:bg-white/8 hover:text-text",
	},
	variants: {
		active: { true: { tab: "text-text" } },
		/** The launcher's grid button, pushed right with the gear. */
		launcher: { true: { tab: "ml-auto w-7.5 shrink-0 justify-center p-0" } },
		/** Windows Island: round icon tabs, ringed in the module's color. */
		iconsOnly: {
			true: {
				tab: "w-8 shrink-0 justify-center rounded-full p-0 opacity-55 transition-opacity hover:opacity-100",
				pill: "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--tab-accent)_70%,transparent)]",
				dot: "absolute top-0.75 right-0.75 shadow-[0_0_0_1.5px_#000]",
			},
		},
		bottom: {
			true: { base: "m-0 mt-2 justify-center", extra: "ml-1.5", gear: "ml-1.5" },
		},
	},
	compoundVariants: [
		{ iconsOnly: true, active: true, class: { tab: "opacity-100" } },
		{ iconsOnly: true, launcher: true, class: { tab: "ml-1.5 w-8 [--tab-accent:#fff]" } },
	],
});

export function Tabs({
	entries,
	current,
	onSelect,
	onReorder,
	iconsOnly,
	bottom,
	transition,
	navigation,
	extra,
}: {
	entries: ModuleEntry[];
	current: string | null;
	onSelect: (id: string) => void;
	onReorder?: (ids: string[]) => void;
	iconsOnly: boolean;
	/** Below the content (Windows Island): centered. */
	bottom: boolean;
	transition: Transition;
	navigation: TabNavigationOptions | null;
	/** The open module's `tabBarExtra`, shown next to the gear. */
	extra?: ReactNode;
}) {
	const t = useT();
	const s = tabs({ iconsOnly, bottom });
	const groupId = useId();
	const reducedMotion = useReducedMotion();
	const timer = useRef<number | undefined>(undefined);
	const pending = useRef<string | null>(null);
	const pressed = useRef(false);
	const dragging = useRef(false);
	const suppressClick = useRef(false);
	const latest = useRef({ current, entries, onSelect, navigation });
	latest.current = { current, entries, onSelect, navigation };
	const cancelHover = () => {
		window.clearTimeout(timer.current);
		pending.current = null;
	};
	useEffect(() => {
		const release = () => {
			pressed.current = false;
		};
		window.addEventListener("pointerup", release);
		window.addEventListener("pointercancel", release);
		return () => {
			window.clearTimeout(timer.current);
			window.removeEventListener("pointerup", release);
			window.removeEventListener("pointercancel", release);
		};
	}, []);
	const select = (id: string) => {
		cancelHover();
		if (dragging.current || suppressClick.current) return;
		onSelect(id);
	};
	// 只从实际指针移动开始计时，避免面板变宽时图标经过静止鼠标而连锁切换。
	const hover = (id: string, pointerType: string) => {
		if (pending.current === id) return;
		cancelHover();
		if (!navigation || pointerType !== "mouse" || pressed.current || dragging.current || id === current) return;
		pending.current = id;
		timer.current = window.setTimeout(() => {
			pending.current = null;
			const next = latest.current;
			if (!next.navigation || pressed.current || dragging.current || next.current === id) return;
			if (id !== LAUNCHER && !next.entries.some((entry) => entry.module.id === id)) return;
			next.onSelect(id);
		}, navigation.hoverDelayMs);
	};
	const pill = (
		<motion.span
			layoutId="tab-pill"
			className={`${s.pill()} pointer-events-none`}
			transition={
				reducedMotion
					? { duration: 0 }
					: navigation
						? { type: "spring", visualDuration: navigation.slideDurationMs / 1000, bounce: 0.08 }
						: transition
			}
		/>
	);
	const renderTab = ({ module, view }: ModuleEntry, draggable = false) => {
		const selected = current === module.id;
		const className = `${s.tab({ active: selected })}${draggable ? " cursor-grab touch-none active:cursor-grabbing" : ""}`;
		return (
			<button
				type="button"
				key={module.id}
				className={className}
				title={t(module.title)}
				style={{ "--tab-accent": view.accent ?? "#fff" } as CSSProperties}
				onPointerMove={(event) => hover(module.id, event.pointerType)}
				onPointerLeave={cancelHover}
				onClick={() => select(module.id)}
			>
				{selected && pill}
				<span className={s.part()}>{view.icon}</span>
				{/* Many modules: only the open tab spells out its name. */}
				{!iconsOnly && selected && <span className={s.part()}>{t(module.title)}</span>}
				{view.active && !selected && <span className={s.dot()} />}
			</button>
		);
	};
	return (
		<LayoutGroup id={groupId}>
			<div
				className={s.base()}
				data-no-drag
				onPointerLeave={cancelHover}
				onKeyDownCapture={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						cancelHover();
						suppressClick.current = false;
					}
				}}
				onPointerDownCapture={() => {
					cancelHover();
					pressed.current = true;
					suppressClick.current = false;
				}}
			>
				{iconsOnly ? (
					<Reorder.Group
						as="div"
						axis="x"
						className="flex shrink-0 items-center gap-1"
						values={entries.map((entry) => entry.module.id)}
						onReorder={(ids) => onReorder?.(ids)}
					>
						{entries.map(({ module, view }) => (
							<Reorder.Item
								as="button"
								type="button"
								key={module.id}
								value={module.id}
								className={`${s.tab({ active: current === module.id })} cursor-grab touch-none active:cursor-grabbing`}
								title={`${t(module.title)} · ${t("layout.drag")}`}
								style={{ "--tab-accent": view.accent ?? "#fff" } as CSSProperties}
								whileDrag={{ scale: 1.12, zIndex: 1, boxShadow: "0 8px 18px -8px rgba(0,0,0,0.65)" }}
								onPointerMove={(event) => hover(module.id, event.pointerType)}
								onPointerLeave={cancelHover}
								onDragStart={() => {
									cancelHover();
									dragging.current = true;
									suppressClick.current = true;
								}}
								onDragEnd={() => {
									dragging.current = false;
								}}
								onClick={() => select(module.id)}
							>
								{current === module.id && pill}
								<span className={s.part()}>{view.icon}</span>
								{view.active && current !== module.id && <span className={s.dot()} />}
							</Reorder.Item>
						))}
					</Reorder.Group>
				) : (
					entries.map((entry) => renderTab(entry))
				)}
				<button
					type="button"
					className={s.tab({ active: current === LAUNCHER, launcher: true })}
					title={t("layout.launcher")}
					onPointerMove={(event) => hover(LAUNCHER, event.pointerType)}
					onPointerLeave={cancelHover}
					onClick={(e) => {
						e.stopPropagation();
						select(LAUNCHER);
					}}
				>
					{current === LAUNCHER && pill}
					<span className={s.part()}>
						<LayoutGridIcon size={14} />
					</span>
				</button>
				{/* Sliders inside: pressing them must not drag the island. */}
				{extra && (
					<div className={s.extra()} data-no-drag>
						{extra}
					</div>
				)}
				<motion.button
					className={s.gear()}
					title={t("island.settings")}
					whileHover={{ rotate: 45 }}
					whileTap={{ scale: 0.85 }}
					transition={{ type: "spring", stiffness: 300, damping: 15 }}
					onClick={(e) => {
						e.stopPropagation();
						command("open_settings");
					}}
				>
					<SettingsIcon size={16} />
				</motion.button>
			</div>
		</LayoutGroup>
	);
}
