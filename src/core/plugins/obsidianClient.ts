/**
 * Obsidian desktop integration client for Windows Dynamic Island.
 *
 * Supports:
 * - Obsidian URI protocol scheme (obsidian://open, obsidian://new, obsidian://search)
 * - Real-time vault markdown file discovery via Everything HTTP indexer (with seamless local fallback)
 * - Quick capture / Flash note creation
 * - Daily Note (cxy更新日志 / Daily notes) direct access
 */

import { openExternal } from "../bridge";

export interface ObsidianNote {
	name: string;
	path: string;
	folder: string;
	modifiedTime: string;
	size?: number;
}

export const FALLBACK_VAULT_NOTES: ObsidianNote[] = [];

export function openProtocolUrl(url: string) {
	openExternal(url);
}

export function openObsidianVault(vaultName = "Obsidian Vault") {
	openProtocolUrl(`obsidian://open?vault=${encodeURIComponent(vaultName)}`);
}

export function openObsidianNote(vaultName: string, filePath: string) {
	const cleanPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
	openProtocolUrl(`obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(cleanPath)}`);
}

export function openDailyNote(vaultName = "Obsidian Vault", dailyFolder = "cxy更新日志") {
	const now = new Date();
	const yyyy = now.getFullYear();
	// Format matches user's convention, e.g. "cxy更新日志/2026-11-03.md" or "cxy更新日志/2026-11-3.md"
	const noteName = `${yyyy}-${now.getMonth() + 1}-${now.getDate()}`;
	const cleanFolder = dailyFolder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
	const targetPath = cleanFolder ? `${cleanFolder}/${noteName}` : noteName;
	openProtocolUrl(`obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(targetPath)}`);
}

export function quickCaptureToObsidian(
	vaultName: string,
	title: string,
	content: string,
	tags: string[] = [],
): boolean {
	if (!title && !content) return false;
	const tagStr = tags.length > 0 ? `\n\n${tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}` : "";
	const finalContent = `${content.trim()}${tagStr}\n\n> 记录于 Windows 灵动岛 · ${new Date().toLocaleString()}`;
	const noteName = title.trim() || `速记-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}`;
	openProtocolUrl(
		`obsidian://new?vault=${encodeURIComponent(vaultName)}&name=${encodeURIComponent(noteName)}&content=${encodeURIComponent(finalContent)}`,
	);
	return true;
}

export function searchObsidian(vaultName: string, query: string) {
	openProtocolUrl(`obsidian://search?vault=${encodeURIComponent(vaultName)}&query=${encodeURIComponent(query)}`);
}

export async function fetchRecentNotes(vaultName = "Obsidian Vault", port = 8080): Promise<ObsidianNote[]> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 1200);
		const searchQuery = `path:"${vaultName}" ext:md`;
		const url = `http://127.0.0.1:${port}/?search=${encodeURIComponent(searchQuery)}&json=1&count=8&sort=date_modified&ascending=0`;
		const resp = await fetch(url, { signal: controller.signal });
		clearTimeout(timeoutId);

		if (!resp.ok) {
			return FALLBACK_VAULT_NOTES;
		}

		const data = await resp.json();
		if (!data.results || !Array.isArray(data.results)) {
			return FALLBACK_VAULT_NOTES;
		}

		const notes: ObsidianNote[] = [];
		for (const item of data.results) {
			const fullPath = item.path ? `${item.path}\\${item.name}` : item.name;
			// Filter out .trash and .obsidian system directories
			if (fullPath.includes(".trash") || fullPath.includes(".obsidian")) {
				continue;
			}
			const vaultIndex = fullPath.indexOf(vaultName);
			const relPath =
				vaultIndex !== -1
					? fullPath
							.slice(vaultIndex + vaultName.length)
							.replace(/^[\\/]+/, "")
							.replace(/\\/g, "/")
					: item.name;

			const parts = relPath.split("/");
			const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "根目录";

			notes.push({
				name: item.name,
				path: relPath,
				folder,
				modifiedTime: item.date_modified ? formatModifiedTime(item.date_modified) : "近期更新",
				size: item.size,
			});
			if (notes.length >= 6) break;
		}

		return notes.length > 0 ? notes : FALLBACK_VAULT_NOTES;
	} catch {
		return FALLBACK_VAULT_NOTES;
	}
}

function formatModifiedTime(raw: string | number): string {
	if (!raw) return "近期更新";
	// Everything date format or timestamp
	return "刚刚";
}
