import { useEffect, useState } from "react";
import { StatusRing, useStatusRingText } from "../../../components/island/StatusRing";
import { command, isTauri } from "../../bridge";
import { useT } from "../../i18n";
import type { StatusRingKind, StatusRingReading } from "../statusRing";

// The optional SDK hook lets the package detect older hosts before invoking commands.
function statusRingHost() {
	return (
		globalThis as typeof globalThis & {
			__ISLAND_PLUGIN_SDK__?: { setIslandStatusRing?: (reading: StatusRingReading | null) => void };
		}
	).__ISLAND_PLUGIN_SDK__?.setIslandStatusRing;
}

function metric(settings: Record<string, unknown>): StatusRingKind {
	return settings.metric === "battery" ? "battery" : "wifi";
}

function useReading(kind: StatusRingKind) {
	const [reading, setReading] = useState<StatusRingReading | null>(null);
	useEffect(() => {
		if (!isTauri || !statusRingHost()) return;
		let disposed = false;
		let timer: ReturnType<typeof setTimeout>;
		const refresh = async () => {
			try {
				const next = await command<StatusRingReading>("status_ring_read", { kind });
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
	}, [kind]);
	return reading?.kind === kind ? reading : null;
}

export function StatusRingBackground({ settings }: { settings: Record<string, unknown> }) {
	const kind = metric(settings);
	const taskbar = settings.placement === "taskbar";
	const reading = useReading(kind);
	useEffect(() => {
		const publish = statusRingHost();
		if (!publish) return;
		if (!taskbar) publish(reading);
		else void command("status_ring_set_taskbar", { reading }).catch(console.error);
	}, [reading, taskbar]);
	useEffect(
		() => () => {
			const publish = statusRingHost();
			if (!publish) return;
			if (taskbar) void command("status_ring_set_taskbar", { reading: null }).catch(console.error);
			else publish(null);
		},
		[taskbar],
	);
	return null;
}

function RingDetails({ reading }: { reading: StatusRingReading }) {
	const { label, value, detail } = useStatusRingText(reading);
	return (
		<div className="flex items-center gap-4">
			<StatusRing reading={reading} size={58} />
			<div className="flex flex-col gap-1">
				<span className="text-sm text-white/65">{label}</span>
				<span className="text-2xl font-semibold tabular-nums">{value}</span>
				{detail && <span className="text-xs text-white/65">{detail}</span>}
			</div>
		</div>
	);
}

export function StatusRingWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const reading = useReading(metric(settings));
	return (
		<div className="flex h-full items-center justify-center px-5 py-3 text-white">
			{reading ? (
				<RingDetails reading={reading} />
			) : (
				<p className="text-sm text-white/65">
					{t(!isTauri || !statusRingHost() ? "statusRing.requiresHost" : "statusRing.loading")}
				</p>
			)}
		</div>
	);
}
