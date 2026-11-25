import { useEffect, useState } from "react";
import { command, useTauriEvent } from "../../core/bridge";
import { useSyncLocale } from "../../core/i18n";
import type { StatusRingReading } from "../../core/plugins/statusRing";
import { StatusRing } from "./StatusRing";

export function StatusRingTaskbar() {
	const [reading, setReading] = useState<StatusRingReading | null>(null);
	useSyncLocale();
	useTauriEvent<StatusRingReading | null>("status-ring://changed", setReading);
	useEffect(() => {
		let disposed = false;
		let timer: ReturnType<typeof setTimeout>;
		const refresh = async () => {
			try {
				const current = await command<StatusRingReading | null>("status_ring_taskbar");
				if (!disposed) setReading(current);
			} catch (error) {
				console.error("Could not read taskbar status ring:", error);
			}
			if (!disposed) timer = setTimeout(refresh, 4000);
		};
		void refresh();
		return () => {
			disposed = true;
			clearTimeout(timer);
		};
	}, []);
	return reading ? (
		<div className="grid size-full place-items-center rounded-full border border-white/12 bg-[#10131b]/95">
			<StatusRing reading={reading} size={32} />
		</div>
	) : null;
}
