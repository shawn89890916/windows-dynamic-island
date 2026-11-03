/**
 * Everything Search Client
 * Connects to Voidtools Everything embedded HTTP Server (http://127.0.0.1:8080).
 */

export interface EverythingItem {
	type: "file" | "folder";
	name: string;
	path: string;
	size?: number;
	date_modified?: string;
}

export interface EverythingResponse {
	totalResults: number;
	results: EverythingItem[];
}

export async function queryEverything(
	query: string,
	port = 8080,
	count = 5,
): Promise<{ ok: boolean; total: number; items: EverythingItem[]; error?: string }> {
	const trimmed = query.trim();
	if (!trimmed) {
		return { ok: true, total: 0, items: [] };
	}

	const tryPorts = [port];
	if (port !== 80 && !tryPorts.includes(80)) tryPorts.push(80);
	if (port !== 8080 && !tryPorts.includes(8080)) tryPorts.push(8080);

	let lastError = "";

	for (const p of tryPorts) {
		const url = `http://127.0.0.1:${p}/?search=${encodeURIComponent(trimmed)}&json=1&count=${count}`;
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 1000);
			const res = await fetch(url, { signal: controller.signal });
			clearTimeout(timeout);

			if (res.ok) {
				const data: EverythingResponse = await res.json();
				return {
					ok: true,
					total: data.totalResults ?? data.results?.length ?? 0,
					items: data.results ?? [],
				};
			}
		} catch (err) {
			lastError = err instanceof Error ? err.message : String(err);
		}
	}

	return {
		ok: false,
		total: 0,
		items: [],
		error: lastError || "无法连接到 Everything HTTP 服务",
	};
}

export function formatFileSize(bytes?: number): string {
	if (!bytes || bytes <= 0) return "--";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
