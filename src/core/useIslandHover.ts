import { useCallback, useEffect, useRef, useState } from "react";

const HOVER_IN_DELAY = 220;
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
export function useIslandHover({ expandOnHover, onOpen, onClose }: Options) {
	const [open, setOpen] = useState(false);
	const openRef = useRef(false);
	const timer = useRef<number | undefined>(undefined);
	const latest = useRef({ expandOnHover, onOpen, onClose });
	latest.current = { expandOnHover, onOpen, onClose };

	const pointerInside = useRef(false);
	const locked = useRef(false);
	const holds = useRef(new Set<string>());
	const resizedAt = useRef(0);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	const transition = useCallback((inside: boolean, delay = inside ? HOVER_IN_DELAY : HOVER_OUT_DELAY) => {
		window.clearTimeout(timer.current);
		// Back in before the island closed (or out before it opened): nothing to do.
		if (inside === openRef.current) return;
		const apply = () => {
			if (inside && delay > 0 && !latest.current.expandOnHover) return;
			openRef.current = inside;
			setOpen(inside);
			if (inside) latest.current.onOpen();
			else latest.current.onClose();
		};
		if (delay === 0) return apply();
		timer.current = window.setTimeout(apply, delay);
	}, []);

	const onPointer = useCallback(
		(inside: boolean, cursorMoved = true) => {
			pointerInside.current = inside;
			if (locked.current || holds.current.size > 0) return;
			const resizedAway = !inside && !cursorMoved && Date.now() - resizedAt.current < RESIZE_GRACE_MS;
			if (!inside || latest.current.expandOnHover) transition(inside, resizedAway ? RESIZE_OUT_DELAY : undefined);
			else window.clearTimeout(timer.current);
		},
		[transition],
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
