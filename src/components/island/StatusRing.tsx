import type { ReactNode } from "react";
import { useT } from "../../core/i18n";
import type { StatusRingReading } from "../../core/plugins/statusRing";

export function useStatusRingText(reading: StatusRingReading) {
	const t = useT();
	const battery = reading.batteryPercent === null ? t("statusRing.unknown") : `${reading.batteryPercent}%`;
	const wifi = t(reading.wifiConnected ? "statusRing.connected" : "statusRing.disconnected");
	const wifiSignal = reading.wifiSignalBars === null ? t("statusRing.unavailable") : `${reading.wifiSignalBars}/5`;
	const cellular =
		reading.cellularSignalBars === null
			? t("statusRing.unavailable")
			: `${Math.ceil((reading.cellularSignalBars * 4) / 5)}/4`;
	const charging = reading.charging ? t("statusRing.charging") : null;
	return {
		battery,
		wifi,
		wifiSignal,
		cellular,
		charging,
		description: [
			`${t("statusRing.battery")} ${battery}`,
			`${t("statusRing.wifi")} ${wifi} ${wifiSignal}`,
			`${t("statusRing.cellular")} ${cellular}`,
			charging,
		]
			.filter(Boolean)
			.join(" · "),
	};
}

function RingVisual({ reading, size }: { reading: StatusRingReading; size: number }) {
	const batteryPercent = reading.batteryPercent;
	const batteryColor =
		batteryPercent !== null && batteryPercent <= 20 ? "#fb7185" : reading.charging ? "#86efac" : "#8dd7ff";
	const signalBars = reading.cellularSignalBars === null ? 0 : Math.ceil((reading.cellularSignalBars * 4) / 5);
	const dots = [14, 18, 22, 26];
	return (
		<svg
			viewBox="0 0 40 40"
			width={size}
			height={size}
			className="block shrink-0 overflow-visible text-[var(--text)]"
			aria-hidden="true"
		>
			<circle cx="20" cy="20" r="17.5" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.4" />
			{batteryPercent !== null && (
				<circle
					cx="20"
					cy="20"
					r="17.5"
					fill="none"
					pathLength="100"
					stroke={batteryColor}
					strokeWidth="2.8"
					strokeLinecap="round"
					strokeDasharray={`${Math.max(0, Math.min(100, batteryPercent))} 100`}
					transform="rotate(-90 20 20)"
					style={{ transition: "stroke-dasharray 550ms cubic-bezier(.2,.8,.2,1), stroke 300ms ease" }}
				/>
			)}
			<g
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity={reading.wifiConnected ? 0.95 : 0.4}
				style={{ transition: "opacity 240ms ease" }}
			>
				<path d="M11.2 16.2a13.1 13.1 0 0 1 17.6 0" />
				<path d="M14.7 19.7a7.9 7.9 0 0 1 10.6 0" />
				<path d="M17.8 23a3.3 3.3 0 0 1 4.4 0" />
				<circle cx="20" cy="26.1" r=".95" fill="currentColor" stroke="none" />
				{!reading.wifiConnected && <path d="m13.8 14.7 12.4 12.4" />}
			</g>
			{dots.map((x, index) => (
				<circle
					key={x}
					cx={x}
					cy="31.8"
					r="1.25"
					fill={index < signalBars ? "#8dd7ff" : "currentColor"}
					opacity={index < signalBars ? 1 : 0.22}
					style={{ transition: "fill 240ms ease, opacity 240ms ease" }}
				/>
			))}
		</svg>
	);
}

export function StatusRing({
	reading,
	size = 40,
	onClick,
	className,
}: {
	reading: StatusRingReading;
	size?: number;
	onClick?: () => void;
	className?: string;
}) {
	const { description } = useStatusRingText(reading);
	const visual: ReactNode = <RingVisual reading={reading} size={size} />;
	if (onClick) {
		return (
			<button
				type="button"
				aria-label={description}
				title={description}
				className={`grid place-items-center rounded-full bg-transparent p-0 transition-transform duration-200 hover:scale-[1.06] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${className ?? ""}`}
				onClick={onClick}
			>
				{visual}
			</button>
		);
	}
	return (
		<span
			role="img"
			aria-label={description}
			title={description}
			className={`inline-grid shrink-0 place-items-center ${className ?? ""}`}
		>
			{visual}
		</span>
	);
}
