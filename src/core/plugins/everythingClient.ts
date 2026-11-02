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

const FALLBACK_ITEMS: EverythingItem[] = [
	{ type: "file", name: "NavoPath.exe", path: "D:\\NavoPath\\NavoPath.exe", size: 315949056 },
	{ type: "file", name: "Everything.exe", path: "D:\\Everything\\Everything.exe", size: 2272424 },
	{ type: "file", name: "Obsidian.exe", path: "D:\\Obsidian\\Obsidian.exe", size: 142551000 },
	{
		type: "file",
		name: "navopath-workspace.json",
		path: "C:\\Users\\华为\\iCloudDrive\\NavoPath\\navopath-workspace.json",
		size: 530211,
	},
	{
		type: "file",
		name: "Island.tsx",
		path: "C:\\Users\\华为\\.gemini\\antigravity\\scratch\\windows-dynamic-island\\src\\components\\Island.tsx",
		size: 5159,
	},
];

export async function queryEverything(
	query: string,
	port = 8080,
	count = 5,
): Promise<{ ok: boolean; total: number; items: EverythingItem[]; error?: string }> {
	const trimmed = query.trim();
	if (!trimmed) {
		return { ok: true, total: 0, items: [] };
	}

	const url = `http://127.0.0.1:${port}/?search=${encodeURIComponent(trimmed)}&json=1&count=${count}`;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 1200);
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(timeout);

		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}

		const data: EverythingResponse = await res.json();
		return {
			ok: true,
			total: data.totalResults ?? data.results?.length ?? 0,
			items: data.results ?? [],
		};
	} catch (err) {
		// Filter fallback items matching query for instant responsive feedback
		const qLower = trimmed.toLowerCase();
		const matchedFallback = FALLBACK_ITEMS.filter(
			(i) => i.name.toLowerCase().includes(qLower) || i.path.toLowerCase().includes(qLower),
		);
		return {
			ok: false,
			total: matchedFallback.length,
			items: matchedFallback,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

export function formatFileSize(bytes?: number): string {
	if (!bytes || bytes <= 0) return "--";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
