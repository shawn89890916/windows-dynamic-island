import { useCallback, useEffect, useRef, useState } from "react";

const HOVER_OUT_DELAY = 200;
/**
 * A resize can move the island away from a stationary pointer. Give the user
 * time to follow the panel in that case.
 */
const RESIZE_GRACE_MS = 2000;
const RESIZE_OUT_DELAY = 1200;

interface Options {
	/** Entering expands the island; when off, only a click does. */
	expandOnHover: boolean;
	hoverDelay: number;
	onOpen: () => void;
	onClose: () => void;
}

/**
 * Whether the island is expanded, as driven by the pointer (the Rust hit-test
 * thread inside Tauri, DOM events in the browser), clicks and shortcuts.
 *
 * Leaving always collapses, after a short delay. Dragging the island
 * (`lockHover`) and holds (`keepOpen`: typing a question, dragging files in)
 * keep it open wherever the pointer goes; the pointer's last state applies
 * once every reason to stay open has ended.
 */
export function useIslandHover({ expandOnHover, hoverDelay, onOpen, onClose }: Options) {
	const [open, setOpen] = useState(false);
	const openRef = useRef(false);
	const timer = useRef<number | undefined>(undefined);
	const latest = useRef({ expandOnHover, hoverDelay, onOpen, onClose });
	latest.current = { expandOnHover, hoverDelay, onOpen, onClose };

	const pointerInside = useRef(false);
	const pointerEnteredAt = useRef(0);
	const locked = useRef(false);
	const holds = useRef(new Set<string>());
	const resizedAt = useRef(0);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	const transition = useCallback((inside: boolean, delay = HOVER_OUT_DELAY, hover = false) => {
		window.clearTimeout(timer.current);
		// Back in before the island closed (or out before it opened): nothing to do.
		if (inside === openRef.current) return;
		const apply = () => {
			if (hover && (!pointerInside.current || !latest.current.expandOnHover || locked.current || holds.current.size)) {
				return;
			}
			openRef.current = inside;
			setOpen(inside);
			if (inside) latest.current.onOpen();
			else latest.current.onClose();
		};
		if (delay === 0) return apply();
		timer.current = window.setTimeout(apply, delay);
	}, []);

	const scheduleOpen = useCallback(
		(delay = latest.current.hoverDelay) => {
			if (!pointerInside.current) return;
			window.clearTimeout(timer.current);
			if (openRef.current || locked.current || holds.current.size) return;
			if (!latest.current.expandOnHover) return;
			const elapsed = performance.now() - pointerEnteredAt.current;
			transition(true, Math.max(0, delay - elapsed), true);
		},
		[transition],
	);

	useEffect(() => {
		if (expandOnHover) scheduleOpen(hoverDelay);
		else if (pointerInside.current && !openRef.current) window.clearTimeout(timer.current);
	}, [expandOnHover, hoverDelay, scheduleOpen]);

	const onPointer = useCallback(
		(inside: boolean, cursorMoved = true) => {
			if (inside && pointerInside.current) return;
			pointerInside.current = inside;
			if (inside) pointerEnteredAt.current = performance.now();
			if (locked.current || holds.current.size > 0) return;
			const resizedAway = !inside && !cursorMoved && Date.now() - resizedAt.current < RESIZE_GRACE_MS;
			if (inside) {
				// Re-entering also cancels any pending close.
				scheduleOpen();
			} else transition(false, resizedAway ? RESIZE_OUT_DELAY : undefined);
		},
		[scheduleOpen, transition],
	);

	const lockHover = useCallback((on: boolean) => {
		locked.current = on;
		if (on) window.clearTimeout(timer.current);
	}, []);

	const keepOpen = useCallback(
		(on: boolean, reason = "default") => {
			if (on) holds.current.add(reason);
			else holds.current.delete(reason);
			if (holds.current.size > 0) window.clearTimeout(timer.current);
			else if (!pointerInside.current) transition(false);
		},
		[transition],
	);

	/** The island is about to change size: give the pointer time to follow. */
	const expectResize = useCallback(() => {
		resizedAt.current = Date.now();
	}, []);

	const expand = useCallback(() => {
		resizedAt.current = Date.now();
		transition(true, 0);
	}, [transition]);
	const collapse = useCallback(() => {
		holds.current.clear();
		transition(false, 0);
	}, [transition]);

	return { open, expand, collapse, onPointer, keepOpen, lockHover, expectResize };
}
