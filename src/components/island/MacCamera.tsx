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
		<div data-mac-privacy-indicator className="pointer-events-none absolute top-0 right-2 z-10">
			<span role="status" className="sr-only">
				{capture === "idle" ? "" : t(`marketplace.plugins.macCompact.${capture}`)}
			</span>
			{capture !== "idle" && (
				<span
					aria-hidden="true"
					data-capture={capture}
					className="block size-1.5 rounded-full"
					style={{ background: capture === "camera" ? "#30D158" : "#FF9F0A" }}
				/>
			)}
		</div>
	);
}
