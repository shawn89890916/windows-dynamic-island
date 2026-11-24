import { useEffect } from "react";
import { command, isTauri } from "./bridge";

const PAD = 6;

/**
 * Keeps the backend informed about which parts of the transparent window are
 * interactive. Every element marked with `data-hit` counts; the rects follow
 * animations because they are re-measured on each animation frame.
 */
export function useHitRects(blurEffect: string, roundedTop: boolean, radius: number) {
	useEffect(() => {
		if (!isTauri) return;
		let raf = 0;
		let last = "";

		const tick = () => {
			raf = requestAnimationFrame(tick);
			const rects = Array.from(document.querySelectorAll<HTMLElement>("[data-hit]")).map((el) => {
				const r = el.getBoundingClientRect();
				return {
					x: Math.round(r.left - PAD),
					y: Math.round(Math.max(0, r.top - PAD)),
					width: Math.round(r.width + PAD * 2),
					height: Math.round(r.height + PAD * 2),
				};
			});
			const shell = document.querySelector<HTMLElement>('[data-blur="true"][data-hit]');
			const bounds = shell?.getBoundingClientRect();
			const surface = shell?.querySelector<HTMLElement>("[data-island-surface]");
			const liveRadius = surface ? Number.parseFloat(getComputedStyle(surface).borderBottomLeftRadius) : radius;
			const blurRect = bounds
				? { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height, roundedTop, radius: liveRadius }
				: null;
			const key = JSON.stringify([rects, blurRect, blurEffect]);
			if (key !== last) {
				last = key;
				command("set_hit_rects", { rects });
				command("set_blur_rect", { rect: blurRect, effect: blurEffect });
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [blurEffect, roundedTop, radius]);
}
