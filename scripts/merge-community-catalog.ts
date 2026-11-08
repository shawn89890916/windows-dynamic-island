import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "plugins/catalog.json");
const communityPath = join(root, "plugins/community.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const community = JSON.parse(await readFile(communityPath, "utf8"));
if (catalog.formatVersion !== 1 || !Array.isArray(catalog.plugins) || !Array.isArray(community))
	throw Error("Plugin catalogue format is invalid");
const builtInIds = new Set(catalog.plugins.map((plugin: { id: string }) => plugin.id));
const builtIns = catalog.plugins;
const publishedIds = new Set<string>();
for (const plugin of community) {
	if (!plugin.id || !plugin.packageUrl || !plugin.sha256 || plugin.sdkVersion !== 1)
		throw Error(`Invalid community plugin catalogue entry: ${plugin.id || "unknown"}`);
	if (builtInIds.has(plugin.id) || publishedIds.has(plugin.id))
		throw Error(`Duplicate marketplace plugin id: ${plugin.id}`);
	publishedIds.add(plugin.id);
}
catalog.plugins = [...builtIns, ...community];
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Merged ${community.length} community plugin entries into the marketplace catalogue`);
