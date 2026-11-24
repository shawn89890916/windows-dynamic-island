import { createStore } from "../island";

export const STATUS_RING_PLUGIN = "com.island.status-ring";

export type StatusRingKind = "wifi" | "battery";

export interface StatusRingReading {
	kind: StatusRingKind;
	percent: number | null;
	connected: boolean;
	charging: boolean;
}

export const islandStatusRing = createStore<StatusRingReading | null>(null);

export function setIslandStatusRing(reading: StatusRingReading | null) {
	islandStatusRing.set(reading);
}
