/**
 * Obsidian desktop integration client for Windows Dynamic Island.
 *
 * Supports:
 * - Obsidian URI protocol scheme (obsidian://open, obsidian://new, obsidian://search)
 * - Custom Vault absolute path or vault name
 * - Real-time vault markdown file discovery via Everything backend indexer
 * - Quick capture / Flash note creation
 * - Daily Note (cxy更新日志 / Daily notes) direct access
 */

import { openExternal, openInFolder } from "../bridge";
import { queryEverything } from "./everythingClient";
import { dailyNoteName, quickCaptureName } from "./obsidianDailyNote";

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

export function openObsidianVault(vaultName = "Obsidian Vault", vaultPath = "") {
	const p = vaultPath.trim();
	if (p) {
		openProtocolUrl(`obsidian://open?path=${encodeURIComponent(p.replace(/\\/g, "/"))}`);
	} else {
		openProtocolUrl(`obsidian://open?vault=${encodeURIComponent(vaultName)}`);
	}
}

export function openObsidianNote(vaultName: string, filePath: string, vaultPath = "") {
	const cleanFile = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
	const p = vaultPath.trim().replace(/\\/g, "/").replace(/\/+$/, "");

	if (cleanFile.includes(":")) {
		openProtocolUrl(`obsidian://open?path=${encodeURIComponent(cleanFile)}`);
	} else if (p) {
		const fullPath = cleanFile.startsWith(p) ? cleanFile : `${p}/${cleanFile}`;
		openProtocolUrl(`obsidian://open?path=${encodeURIComponent(fullPath)}`);
	} else {
		openProtocolUrl(`obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(cleanFile)}`);
	}
}

export function openDailyNote(
	vaultName = "Obsidian Vault",
	dailyFolder = "",
	vaultPath = "",
	dateFormat = "YYYY-MM-DD",
) {
	const noteName = dailyNoteName(new Date(), dateFormat);
	const cleanFolder = dailyFolder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
	const targetRel = cleanFolder ? `${cleanFolder}/${noteName}` : noteName;

	const p = vaultPath.trim().replace(/\\/g, "/").replace(/\/+$/, "");
	if (p) {
		openProtocolUrl(`obsidian://open?path=${encodeURIComponent(`${p}/${targetRel}.md`)}`);
	} else {
		openProtocolUrl(`obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(targetRel)}`);
	}
}

export function quickCaptureToObsidian(
	vaultName: string,
	title: string,
	content: string,
	tags: string[] = [],
	vaultPath = "",
	destinationFolder = "",
	openAfterSave = false,
): boolean {
	if (!title && !content) return false;
	const tagStr = tags.length > 0 ? `\n\n${tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}` : "";
	const finalContent = `${content.trim()}${tagStr}`;
	const noteName = title.trim() || quickCaptureName(new Date());
	const folder = destinationFolder
		.replace(/\\/g, "/")
		.split("/")
		.map((part) => part.trim())
		.filter((part) => part && part !== "." && part !== "..")
		.join("/");
	const fileName = [folder, noteName].filter(Boolean).join("/");
	const openOption = openAfterSave ? "" : "&silent=true";

	const p = vaultPath.trim().replace(/\\/g, "/").replace(/\/+$/, "");
	if (p) {
		openProtocolUrl(
			`obsidian://new?path=${encodeURIComponent(`${p}/${fileName}.md`)}&content=${encodeURIComponent(finalContent)}${openOption}`,
		);
	} else {
		openProtocolUrl(
			`obsidian://new?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(fileName)}&content=${encodeURIComponent(finalContent)}${openOption}`,
		);
	}
	return true;
}

export function searchObsidian(vaultName: string, query: string, vaultPath = "") {
	const p = vaultPath.trim().replace(/\\/g, "/");
	if (p) {
		openProtocolUrl(`obsidian://search?path=${encodeURIComponent(p)}&query=${encodeURIComponent(query)}`);
	} else {
		openProtocolUrl(`obsidian://search?vault=${encodeURIComponent(vaultName)}&query=${encodeURIComponent(query)}`);
	}
}

export { openInFolder };

export async function fetchRecentNotes(
	vaultName = "Obsidian Vault",
	port = 8080,
	vaultPath = "",
): Promise<ObsidianNote[]> {
	const searchTarget = vaultPath.trim() || vaultName;
	if (!searchTarget) return FALLBACK_VAULT_NOTES;

	try {
		const searchQuery = `path:"${searchTarget}" ext:md`;
		const res = await queryEverything(searchQuery, port, 10);
		if (!res.ok) throw Error(res.error || "Everything 索引不可用");
		if (!res.items?.length) return [];

		const notes: ObsidianNote[] = [];
		const matchKey = vaultPath.trim().replace(/\\/g, "/") || vaultName;

		for (const item of res.items) {
			const fullPath = item.path ? `${item.path}\\${item.name}` : item.name;
			if (fullPath.includes(".trash") || fullPath.includes(".obsidian")) {
				continue;
			}
			const normalizedPath = fullPath.replace(/\\/g, "/");
			const vaultIndex = normalizedPath.toLowerCase().indexOf(matchKey.toLowerCase());
			const relPath =
				vaultIndex !== -1 ? normalizedPath.slice(vaultIndex + matchKey.length).replace(/^[\\/]+/, "") : item.name;

			const parts = relPath.split("/");
			const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "根目录";

			notes.push({
				name: item.name.replace(/\.md$/i, ""),
				path: fullPath,
				folder,
				modifiedTime: item.date_modified ? formatModifiedTime(item.date_modified) : "近期更新",
				size: item.size,
			});
			if (notes.length >= 6) break;
		}

		return notes.length > 0 ? notes : FALLBACK_VAULT_NOTES;
	} catch (error) {
		throw error instanceof Error ? error : new Error("无法读取笔记索引");
	}
}

function formatModifiedTime(raw: string | number): string {
	if (!raw) return "近期更新";
	if (typeof raw === "string" && raw.includes("-")) {
		return raw.slice(5, 16);
	}
	return "刚刚更新";
}
