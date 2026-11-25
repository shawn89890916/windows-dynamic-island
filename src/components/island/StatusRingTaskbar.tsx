import { useCallback, useEffect, useState } from "react";
import { command, useTauriEvent } from "../../core/bridge";
import { useSyncLocale } from "../../core/i18n";
import {
	normalizeStatusRingReading,
	type StatusRingInput,
	type StatusRingReading,
} from "../../core/plugins/statusRing";
import { StatusRing } from "./StatusRing";

export function StatusRingTaskbar() {
	const [reading, setReading] = useState<StatusRingReading | null>(null);
	useSyncLocale();
	const applyReading = useCallback(
		(value: StatusRingInput | null) => setReading(value ? normalizeStatusRingReading(value) : null),
		[],
	);
	useTauriEvent<StatusRingInput | null>("status-ring://changed", applyReading);
	useEffect(() => {
		let disposed = false;
		let timer: ReturnType<typeof setTimeout>;
		const refresh = async () => {
			try {
				const current = await command<StatusRingInput | null>("status_ring_taskbar");
				if (!disposed) applyReading(current);
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
	}, [applyReading]);
	return reading ? (
		<StatusRing
			reading={reading}
			size={40}
			className="size-full"
			onClick={() => void command("status_ring_open_island")}
		/>
	) : null;
}
