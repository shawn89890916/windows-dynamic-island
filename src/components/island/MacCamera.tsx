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
		<div className="pointer-events-none absolute top-4 left-1/2 z-10 -ml-6 -translate-x-1/2 -translate-y-1/2">
			<span
				data-mac-camera
				aria-hidden="true"
				className="block size-2.5 rounded-full border border-[#17181e] bg-[radial-gradient(circle_at_38%_35%,#27283a_0%,#11121c_30%,#050507_62%)]"
			/>
			<span role="status" className="sr-only">
				{capture === "idle" ? "" : t(`marketplace.plugins.macCompact.${capture}`)}
			</span>
			{capture !== "idle" && (
				<span
					aria-hidden="true"
					data-capture={capture}
					className="absolute top-1/2 left-[19px] size-1.5 -translate-y-1/2 rounded-full"
					style={{ background: capture === "camera" ? "#30D158" : "#FF9F0A" }}
				/>
			)}
		</div>
	);
}
