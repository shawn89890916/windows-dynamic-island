import { Battery, BatteryCharging, Signal, Wifi, WifiOff } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { StatusRing, useStatusRingText } from "../../../components/island/StatusRing";
import { command, isTauri } from "../../bridge";
import { useT } from "../../i18n";
import type { StatusRingInput, StatusRingReading } from "../statusRing";

// The optional SDK hook lets the package detect older hosts before invoking commands.
function statusRingHost() {
	return (
		globalThis as typeof globalThis & {
			__ISLAND_PLUGIN_SDK__?: { setIslandStatusRing?: (reading: StatusRingInput | null) => void };
		}
	).__ISLAND_PLUGIN_SDK__?.setIslandStatusRing;
}

function useReading() {
	const [reading, setReading] = useState<StatusRingReading | null>(null);
	useEffect(() => {
		if (!isTauri || !statusRingHost()) return;
		let disposed = false;
		let timer: ReturnType<typeof setTimeout>;
		const refresh = async () => {
			try {
				const next = await command<StatusRingReading>("status_ring_read_all");
				if (!disposed) setReading(next);
			} catch {
				if (!disposed) setReading(null);
			}
			if (!disposed) timer = setTimeout(refresh, 3000);
		};
		void refresh();
		return () => {
			disposed = true;
			clearTimeout(timer);
		};
	}, []);
	return reading;
}

export function StatusRingBackground({ settings }: { settings: Record<string, unknown> }) {
	const taskbar = settings.placement === "taskbar";
	const reading = useReading();
	useEffect(() => {
		const publish = statusRingHost();
		if (!publish) return;
		if (!taskbar) publish(reading);
		else void command("status_ring_set_taskbar_all", { reading }).catch(console.error);
	}, [reading, taskbar]);
	useEffect(
		() => () => {
			const publish = statusRingHost();
			if (!publish) return;
			if (taskbar) void command("status_ring_set_taskbar_all", { reading: null }).catch(console.error);
			else publish(null);
		},
		[taskbar],
	);
	return null;
}

function StatusRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
	return (
		<div className="flex items-center gap-2 text-sm">
			<span className="grid size-4 shrink-0 place-items-center text-[var(--text-dim)]">{icon}</span>
			<span className="min-w-0 flex-1 truncate text-[var(--text-dim)]">{label}</span>
			<span className="shrink-0 font-medium tabular-nums text-[var(--text)]">{value}</span>
		</div>
	);
}

function RingDetails({ reading }: { reading: StatusRingReading }) {
	const t = useT();
	const { battery, wifi, wifiSignal, cellular, charging } = useStatusRingText(reading);
	return (
		<div className="flex min-w-0 items-center gap-4">
			<StatusRing reading={reading} size={60} />
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<StatusRow
					icon={reading.charging ? <BatteryCharging size={15} /> : <Battery size={15} />}
					label={t("statusRing.battery")}
					value={charging ? `${battery} · ${charging}` : battery}
				/>
				<StatusRow
					icon={reading.wifiConnected ? <Wifi size={15} /> : <WifiOff size={15} />}
					label={t("statusRing.wifi")}
					value={`${wifi} · ${wifiSignal}`}
				/>
				<StatusRow
					icon={<Signal size={15} />}
					label={t("statusRing.cellular")}
					value={reading.cellularConnected ? cellular : t("statusRing.disconnected")}
				/>
			</div>
		</div>
	);
}

export function StatusRingWidget(_props: { settings: Record<string, unknown> }) {
	const t = useT();
	const reading = useReading();
	return (
		<div className="flex h-full items-center justify-center px-5 py-3 text-[var(--text)]">
			{reading ? (
				<RingDetails reading={reading} />
			) : (
				<p className="text-sm text-[var(--text-dim)]">
					{t(!isTauri || !statusRingHost() ? "statusRing.requiresHost" : "statusRing.loading")}
				</p>
			)}
		</div>
	);
}
