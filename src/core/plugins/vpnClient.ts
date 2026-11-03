/**
 * VPN / Proxy monitoring client for Windows Dynamic Island.
 * Connects to UniClash, Clash Verge, or standard mixed-port (default 8993).
 */

export type RoutingMode = "rule" | "global" | "direct";

export interface VpnStats {
	connected: boolean;
	port: number;
	mode: RoutingMode;
	activeNode: string;
	latencyMs: number | null;
	downloadSpeed: number; // bytes per second
	uploadSpeed: number; // bytes per second
	totalDownload: number; // bytes
	totalUpload: number; // bytes
}

export function formatSpeed(bytesPerSec: number): string {
	if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
	if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
	return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

export function formatTraffic(bytes: number): string {
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function pingProxy(
	testUrl = "https://www.gstatic.com/generate_204",
	timeoutMs = 4000,
): Promise<number | null> {
	const start = performance.now();
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		await fetch(testUrl, {
			method: "HEAD",
			mode: "no-cors",
			cache: "no-store",
			signal: controller.signal,
		});
		clearTimeout(timer);
		return Math.round(performance.now() - start);
	} catch {
		return null;
	}
}

export function launchVpnApp(clientPath = "D:\\UniClash\\uniclash.exe") {
	if (typeof window !== "undefined") {
		// Try custom URI or fallback
		const target = `file:///${clientPath.replace(/\\/g, "/")}`;
		window.open(target, "_blank");
	}
}
