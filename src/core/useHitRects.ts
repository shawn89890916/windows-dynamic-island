import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import { command, isTauri } from "./bridge";

// Give Windows a generous native hit target around the toolbar. The overlay
// must leave click-through mode before the pointer reaches the DOM controls.
const PAD = 16;

/**
 * Keeps the backend informed about which parts of the transparent window are
 * interactive. Every element marked with `data-hit` counts; the rects follow
 * animations because they are re-measured on each animation frame.
 */
export function useHitRects(blurEffect: string, roundedTop: boolean) {
	useEffect(() => {
		if (!isTauri) return;
		let raf = 0;
		let last = "";
		let disposed = false;
		let stopWatchingMove: (() => void) | undefined;
		// Moving the native window can leave all CSS bounds unchanged.
		void getCurrentWindow()
			.onMoved(() => {
				last = "";
			})
			.then((unlisten) => {
				if (disposed) unlisten();
				else stopWatchingMove = unlisten;
			})
			.catch(console.error);

		const tick = () => {
			raf = requestAnimationFrame(tick);
			const rects = Array.from(document.querySelectorAll<HTMLElement>("[data-hit]")).map((el) => {
				const r = el.getBoundingClientRect();
				const x = Math.floor(r.left - PAD);
				const y = Math.floor(Math.max(0, r.top - PAD));
				return {
					x,
					y,
					width: Math.ceil(r.right + PAD) - x,
					height: Math.ceil(r.bottom + PAD) - y,
					moduleId: el.dataset.hitModule || null,
				};
			});
			const shell = document.querySelector<HTMLElement>('[data-blur="true"][data-hit]');
			const surface = shell?.querySelector<HTMLElement>("[data-island-surface]");
			const bounds = surface?.getBoundingClientRect();
			const ear = shell?.querySelector<HTMLElement>("[data-notch-ear]")?.getBoundingClientRect();
			const [radiusX, radiusY = radiusX] = surface
				? getComputedStyle(surface).borderBottomLeftRadius.split(" ").map(Number.parseFloat)
				: [0];
			const blurRect =
				surface && bounds
					? {
							x: bounds.left,
							y: bounds.top,
							width: bounds.width,
							height: bounds.height,
							roundedTop,
							radiusX,
							radiusY,
							earWidth: ear?.width ?? 0,
							earHeight: ear?.height ?? 0,
						}
					: null;
			const key = JSON.stringify([rects, blurRect, blurEffect]);
			if (key !== last) {
				last = key;
				command("set_hit_rects", { rects });
				command("set_blur_rect", { rect: blurRect, effect: blurEffect });
			}
		};
		raf = requestAnimationFrame(tick);
		return () => {
			disposed = true;
			stopWatchingMove?.();
			cancelAnimationFrame(raf);
		};
	}, [blurEffect, roundedTop]);
}
