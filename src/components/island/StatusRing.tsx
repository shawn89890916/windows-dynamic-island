import { Battery, BatteryCharging, Wifi, WifiOff } from "lucide-react";
import { useT } from "../../core/i18n";
import type { StatusRingReading } from "../../core/plugins/statusRing";

export function useStatusRingText(reading: StatusRingReading) {
	const t = useT();
	const { kind, percent, connected, charging } = reading;
	const label = t(kind === "wifi" ? "statusRing.wifi" : "statusRing.battery");
	const value = percent === null ? t(connected ? "statusRing.unknown" : "statusRing.unavailable") : `${percent}%`;
	const detail = charging ? t("statusRing.charging") : null;
	return { label, value, detail, description: [label, value, detail].filter(Boolean).join(" · ") };
}

export function StatusRing({ reading, size = 30 }: { reading: StatusRingReading; size?: number }) {
	const { description } = useStatusRingText(reading);
	const { kind, percent, connected, charging } = reading;
	const Icon = kind === "wifi" ? (connected ? Wifi : WifiOff) : charging ? BatteryCharging : Battery;
	const accent = kind === "wifi" ? "#7dd3fc" : (percent ?? 100) <= 20 ? "#fda4af" : "#86efac";
	return (
		<span
			data-status-ring={kind}
			className="relative inline-grid shrink-0 place-items-center text-white/90"
			role="img"
			aria-label={description}
			title={description}
			style={{ width: size, height: size }}
		>
			<svg viewBox="0 0 32 32" className="absolute inset-0 size-full" aria-hidden="true">
				<circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="2.5" />
				{percent !== null && percent > 0 && (
					<circle
						cx="16"
						cy="16"
						r="13"
						fill="none"
						pathLength="100"
						stroke={accent}
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeDasharray={`${percent} 100`}
						transform="rotate(-90 16 16)"
					/>
				)}
			</svg>
			<Icon aria-hidden="true" size={Math.round(size * 0.47)} strokeWidth={1.8} />
		</span>
	);
}
