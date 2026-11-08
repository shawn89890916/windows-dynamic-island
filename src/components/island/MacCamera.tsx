import { useEffect, useState } from "react";
import { command, isTauri } from "../../core/bridge";
import { useT } from "../../core/i18n";

type CapturePrivacy = "camera" | "microphone" | "idle";

export function MacCamera() {
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
		<div data-mac-privacy-indicator className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
			<span
				data-mac-camera-lens
				aria-hidden="true"
				className="size-4 rounded-full border border-[#33354a] bg-[radial-gradient(circle_at_36%_32%,#727ba0_0%,#3b4264_12%,#1b1d30_36%,#090a10_68%,#030304_100%)] shadow-[inset_0_0_4px_rgba(114,123,160,.45),0_0_2px_rgba(180,190,255,.22)]"
			/>
			<span role="status" className="sr-only">
				{capture === "idle" ? "" : t(`marketplace.plugins.macCompact.${capture}`)}
			</span>
			{capture !== "idle" && (
				<span
					aria-hidden="true"
					data-capture={capture}
					className="absolute top-1/2 left-[calc(50%+10px)] size-1.5 -translate-y-1/2 rounded-full"
					style={{ background: capture === "camera" ? "#30D158" : "#FF9F0A" }}
				/>
			)}
		</div>
	);
}
