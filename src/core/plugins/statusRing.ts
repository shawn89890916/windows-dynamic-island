import { createStore } from "../island";

export const STATUS_RING_PLUGIN = "com.island.status-ring";

export type StatusRingKind = "wifi" | "battery";

/** Legacy SDK 1 reading, still accepted while an app update is rolled out. */
export interface LegacyStatusRingReading {
	kind: StatusRingKind;
	percent: number | null;
	connected: boolean;
	charging: boolean;
}

export interface StatusRingReading {
	batteryPercent: number | null;
	charging: boolean;
	wifiConnected: boolean;
	wifiSignalBars: number | null;
	cellularConnected: boolean;
	cellularSignalBars: number | null;
}

export type StatusRingInput = StatusRingReading | LegacyStatusRingReading;

export function normalizeStatusRingReading(reading: StatusRingInput): StatusRingReading {
	if ("batteryPercent" in reading) return reading;
	return {
		batteryPercent: reading.kind === "battery" ? reading.percent : null,
		charging: reading.kind === "battery" && reading.charging,
		wifiConnected: reading.kind === "wifi" && reading.connected,
		wifiSignalBars: reading.kind === "wifi" && reading.percent !== null ? Math.round(reading.percent / 20) : null,
		cellularConnected: false,
		cellularSignalBars: null,
	};
}

export const islandStatusRing = createStore<StatusRingReading | null>(null);

export function setIslandStatusRing(reading: StatusRingInput | null) {
	islandStatusRing.set(reading ? normalizeStatusRingReading(reading) : null);
}
