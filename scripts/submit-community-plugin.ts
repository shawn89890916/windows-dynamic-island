import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const eventPath = process.env.GITHUB_EVENT_PATH;
const outputPath = process.env.GITHUB_OUTPUT;
if (!eventPath || !outputPath) throw Error("GitHub issue event context is unavailable");
const event = JSON.parse(await readFile(eventPath, "utf8"));
const issue = event.issue;
const login = issue?.user?.login;
if (typeof login !== "string" || !/^[A-Za-z0-9-]{1,39}$/.test(login)) throw Error("Issue author is invalid");
if (!/^- \[x\] I created or have permission to publish this package,/im.test(String(issue.body || "")))
	throw Error("Confirm ownership or permission to publish the package");

function field(label: string) {
	const expression = new RegExp(`^### ${label}\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n### |$)`, "m");
	const value = String(issue.body || "")
		.match(expression)?.[1]
		?.trim();
	if (!value || value === "_No response_") throw Error(`${label} is required`);
	return value;
}

const packageUrl = field("Plugin package URL");
const expectedHash = field("Package SHA-256").toLowerCase();
if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw Error("Package SHA-256 must contain 64 hexadecimal characters");
const url = new URL(packageUrl);
if (
	url.protocol !== "https:" ||
	url.hostname !== "github.com" ||
	url.username ||
	url.password ||
	url.search ||
	url.hash
)
	throw Error("Package URL must be a public GitHub Release asset URL");
const match = url.pathname.match(
	/^\/([^/]+)\/([^/]+)\/releases\/download\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+\.island-plugin\.json)$/,
);
if (!match) throw Error("Package URL must point to a .island-plugin.json asset in a GitHub Release");
const [, owner, , , assetName] = match;
if (owner.toLowerCase() !== login.toLowerCase())
	throw Error("Host the package in a GitHub repository owned by the submitting account");

const response = await fetch(packageUrl, { signal: AbortSignal.timeout(30000) });
if (!response.ok || !response.body) throw Error(`Could not download package (HTTP ${response.status})`);
if (
	!["github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"].includes(
		new URL(response.url).hostname,
	)
)
	throw Error("Package download redirected to an unsupported host");
const chunks: Uint8Array[] = [];
let size = 0;
for await (const chunk of response.body) {
	const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
	size += bytes.byteLength;
	if (size > 8 * 1024 * 1024) throw Error("Package exceeds the 8 MiB limit");
	chunks.push(bytes);
}
const bytes = Buffer.concat(chunks);
const content = bytes.toString("utf8");
if (!Buffer.from(content, "utf8").equals(bytes)) throw Error("Package must be UTF-8 JSON");
const actualHash = createHash("sha256").update(bytes).digest("hex");
if (actualHash !== expectedHash) throw Error("Package SHA-256 does not match");
const pkg = JSON.parse(content);
const manifest = pkg?.manifest;
if (
	pkg?.formatVersion !== 1 ||
	manifest?.sdkVersion !== 1 ||
	typeof pkg.code !== "string" ||
	!pkg.code ||
	typeof pkg.css !== "string"
)
	throw Error("Package must contain executable code, styles, formatVersion 1, and sdkVersion 1");
if (Buffer.byteLength(pkg.code) > 4 * 1024 * 1024 || Buffer.byteLength(pkg.css) > 2 * 1024 * 1024)
	throw Error("Plugin code or styles exceed the supported size limits");
if (
	typeof manifest.id !== "string" ||
	!/^[a-z][a-z0-9._-]{2,119}$/.test(manifest.id) ||
	manifest.id.includes("..") ||
	!manifest.id.includes(".")
)
	throw Error("Plugin id must be a reverse-domain style lowercase id");
if (typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+$/.test(manifest.version))
	throw Error("Plugin version must use numeric MAJOR.MINOR.PATCH format");
if (typeof manifest.name !== "string" || !manifest.name.trim() || manifest.name.length > 120)
	throw Error("Plugin name is required and must be at most 120 characters");
if (typeof manifest.description !== "string" || !manifest.description.trim() || manifest.description.length > 500)
	throw Error("Plugin description is required and must be at most 500 characters");
if (!["productivity", "media", "tools", "developer", "system", "social"].includes(manifest.category))
	throw Error("Plugin category is invalid");
if (typeof manifest.icon !== "string" || !manifest.icon.trim() || manifest.icon.length > 80)
	throw Error("Plugin icon must be a non-empty icon name or emoji (maximum 80 characters)");
let authorUrl: URL;
try {
	authorUrl = new URL(manifest.author?.url);
} catch {
	throw Error("Package author must link to the submitting GitHub account");
}
if (
	authorUrl.protocol !== "https:" ||
	authorUrl.hostname !== "github.com" ||
	authorUrl.pathname.replace(/\/$/, "").toLowerCase() !== `/${login.toLowerCase()}` ||
	authorUrl.search ||
	authorUrl.hash
)
	throw Error("Package author must link to the submitting GitHub account");
if (manifest.id !== assetName.slice(0, -".island-plugin.json".length))
	throw Error("Release asset name must be <plugin-id>.island-plugin.json");

if (
	manifest.tags !== undefined &&
	(!Array.isArray(manifest.tags) ||
		manifest.tags.length > 20 ||
		manifest.tags.some((tag: unknown) => typeof tag !== "string" || tag.length > 40))
)
	throw Error("Plugin tags are invalid");
if (manifest.settings !== undefined) {
	if (!Array.isArray(manifest.settings) || manifest.settings.length > 64) throw Error("Plugin settings are invalid");
	for (const setting of manifest.settings) {
		if (
			typeof setting?.key !== "string" ||
			setting.key.length > 100 ||
			["__proto__", "prototype", "constructor"].includes(setting.key)
		)
			throw Error("Plugin setting key is invalid");
		if (
			typeof setting.label !== "string" ||
			setting.label.length > 120 ||
			!["text", "number", "boolean", "select", "password"].includes(setting.type)
		)
			throw Error("Plugin setting definition is invalid");
	}
}
if (
	manifest.expandedSize !== undefined &&
	(!Number.isFinite(manifest.expandedSize?.width) ||
		!Number.isFinite(manifest.expandedSize?.height) ||
		manifest.expandedSize.width < 200 ||
		manifest.expandedSize.width > 1200 ||
		manifest.expandedSize.height < 80 ||
		manifest.expandedSize.height > 1000)
)
	throw Error("Plugin expandedSize is outside supported bounds");
for (const key of ["homepage", "repository"] as const) {
	if (manifest[key] !== undefined) {
		const link = new URL(manifest[key]);
		if (link.protocol !== "https:") throw Error(`Plugin ${key} must use HTTPS`);
	}
}

const communityPath = join(root, "plugins/community.json");
type CommunityEntry = { id: string; version: string; sha256: string; [key: string]: unknown };
let entries: CommunityEntry[] = [];
try {
	const saved: unknown = JSON.parse(await readFile(communityPath, "utf8"));
	if (
		!Array.isArray(saved) ||
		saved.some(
			(item) =>
				!item || typeof item.id !== "string" || typeof item.version !== "string" || typeof item.sha256 !== "string",
		)
	)
		throw Error("Community catalogue entries are invalid");
	entries = saved as CommunityEntry[];
} catch (error) {
	if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
if (!Array.isArray(entries)) throw Error("Community catalogue source is invalid");
const previous = entries.find((item) => item.id === manifest.id);
const parts = (value: string) => value.split(".").map(Number);
const newer = (candidate: string, current: string) => {
	const a = parts(candidate);
	const b = parts(current);
	for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
	return false;
};
if (previous && previous.version === manifest.version && previous.sha256 === actualHash) {
	// Idempotent retry after a partial publication.
} else if (previous && !newer(manifest.version, previous.version)) {
	throw Error(`Version ${manifest.version} must be newer than the published ${previous.version}`);
}
const filename = `${manifest.id}-${manifest.version}.island-plugin.json`;
const catalogEntry = {
	id: manifest.id,
	name: manifest.name.trim(),
	version: manifest.version,
	description: manifest.description.trim(),
	author: { name: login, url: `https://github.com/${login}` },
	category: manifest.category,
	icon: manifest.icon.trim(),
	sdkVersion: 1,
	permissions: ["在灵动岛窗口执行代码", "使用宿主提供的界面与系统接口"],
	packageUrl: `https://github.com/shawn89890916/windows-dynamic-island/releases/download/plugins/${filename}`,
	sha256: actualHash,
	packageSize: bytes.length,
	...(manifest.appearance === "mac-compact" ? { appearance: "mac-compact" } : {}),
	...(typeof manifest.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(manifest.accentColor)
		? { accentColor: manifest.accentColor }
		: {}),
	...(Array.isArray(manifest.tags) ? { tags: manifest.tags } : {}),
	...(Array.isArray(manifest.settings) ? { settings: manifest.settings } : {}),
	...(manifest.expandedSize ? { expandedSize: manifest.expandedSize } : {}),
	...(typeof manifest.homepage === "string" ? { homepage: manifest.homepage } : {}),
	...(typeof manifest.repository === "string" ? { repository: manifest.repository } : {}),
};
if (previous) entries = entries.map((item) => (item.id === manifest.id ? catalogEntry : item));
else entries.push(catalogEntry);
await writeFile(communityPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
const packagePath = join(root, "plugins/dist", filename);
await writeFile(packagePath, bytes);
await writeFile(
	outputPath,
	`plugin_id=${manifest.id}\nplugin_name=${manifest.name.trim().replace(/[\r\n]/g, " ")}\nplugin_version=${manifest.version}\npackage_path=${packagePath.replace(/\\/g, "/")}\n`,
);
console.log(`Validated ${manifest.id}@${manifest.version} from @${login}; package SHA-256 ${actualHash}`);
