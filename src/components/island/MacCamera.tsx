import { useEffect, useState } from "react";
import { command, isTauri } from "../../core/bridge";
import { useT } from "../../core/i18n";

type CapturePrivacy = "camera" | "microphone" | "idle";

export function MacCamera({ idle }: { idle: boolean }) {
	const t = useT();
	const [capture, setCapture] = useState<CapturePrivacy>("idle");

	useEffect(() => {
		if (!isTauri) return;
		let stopped = false;
		let timer: number | undefined;
		const refresh = async () => {
			const next = await command<CapturePrivacy>("capture_privacy").catch(() => "idle" as const);
			if (stopped) return;
			setCapture(next);
			timer = window.setTimeout(refresh, 650);
		};
		void refresh();
		return () => {
			stopped = true;
			window.clearTimeout(timer);
		};
	}, []);

	return (
		<div data-mac-privacy-indicator className="pointer-events-none absolute inset-0 z-10">
			{idle && (
				<span
					aria-hidden="true"
					data-mac-camera-lens
					className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[#090a0d] shadow-[inset_0_1px_3px_rgba(0,0,0,.95),0_0_1px_rgba(255,255,255,.25)]"
				/>
			)}
			<span role="status" className="sr-only">
				{capture === "idle" ? "" : t(`marketplace.plugins.macCompact.${capture}`)}
			</span>
			{capture !== "idle" && (
				<span
					aria-hidden="true"
					data-capture={capture}
					className="absolute right-2 top-2 block size-1.5 rounded-full"
					style={{ background: capture === "camera" ? "#30D158" : "#FF9F0A" }}
				/>
			)}
		</div>
	);
}
