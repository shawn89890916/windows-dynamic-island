import {
	CheckIcon,
	Code2Icon,
	DownloadIcon,
	ExternalLinkIcon,
	FolderArchiveIcon,
	PackageIcon,
	SearchIcon,
	SlidersIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Card } from "../../components/ui/card";
import { MARKETPLACE_CATALOG } from "../../core/plugins/catalog";
import {
	installPlugin,
	renderPluginIcon,
	togglePlugin,
	uninstallPlugin,
	updatePluginSettings,
	useInstalledPlugins,
} from "../../core/plugins/registry";
import type { InstalledPlugin, PluginCategory, PluginManifest } from "../../core/plugins/types";
import { Lead, Title } from "../components/Heading";
import { Toggle } from "../components/Toggle";

const CATEGORIES: { id: PluginCategory | "all"; label: string }[] = [
	{ id: "all", label: "全部分类" },
	{ id: "productivity", label: "效率工作" },
	{ id: "tools", label: "实用工具" },
	{ id: "media", label: "媒体娱乐" },
];

export function MarketplacePage() {
	const [tab, setTab] = useState<"explore" | "installed" | "sideload">("explore");
	const [search, setSearch] = useState("");
	const [activeCategory, setActiveCategory] = useState<PluginCategory | "all">("all");
	const [configuringPlugin, setConfiguringPlugin] = useState<InstalledPlugin | null>(null);

	const installed = useInstalledPlugins();

	// Filter explore catalog
	const filteredCatalog = MARKETPLACE_CATALOG.filter((plugin) => {
		const matchCategory = activeCategory === "all" || plugin.category === activeCategory;
		const query = search.trim().toLowerCase();
		const matchSearch =
			!query ||
			plugin.name.toLowerCase().includes(query) ||
			plugin.description.toLowerCase().includes(query) ||
			plugin.tags?.some((t) => t.toLowerCase().includes(query)) ||
			plugin.author.name.toLowerCase().includes(query);
		return matchCategory && matchSearch;
	});

	return (
		<div className="flex flex-col gap-5">
			<div>
				<Title>插件市场</Title>
				<Lead>发现、安装与管理由开源社区打造的灵动岛扩展，海量工具随心定制。</Lead>
			</div>

			{/* Sub Tabs */}
			<div className="flex items-center gap-1 rounded-xl border border-white/6 bg-white/3 p-1">
				<TabButton active={tab === "explore"} onClick={() => setTab("explore")}>
					<PackageIcon size={14} />
					<span>探索发现</span>
				</TabButton>
				<TabButton active={tab === "installed"} onClick={() => setTab("installed")}>
					<CheckIcon size={14} />
					<span>已安装</span>
					<span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-text-faint">
						{installed.length}
					</span>
				</TabButton>
				<TabButton active={tab === "sideload"} onClick={() => setTab("sideload")}>
					<Code2Icon size={14} />
					<span>导入与开发</span>
				</TabButton>
			</div>

			{/* Tab 1: Explore */}
			{tab === "explore" && (
				<div className="flex flex-col gap-4">
					{/* Search & Categories */}
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="relative flex-1">
							<SearchIcon size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-text-faint" />
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="搜索插件名称、描述或标签..."
								className="h-9 w-full rounded-lg border border-white/8 bg-white/4 pr-3 pl-8 text-xs text-text placeholder:text-text-faint focus:border-white/20 focus:outline-none"
							/>
						</div>
						<div className="flex flex-wrap items-center gap-1.5">
							{CATEGORIES.map((cat) => (
								<button
									key={cat.id}
									type="button"
									onClick={() => setActiveCategory(cat.id)}
									className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
										activeCategory === cat.id
											? "bg-white/15 text-white"
											: "bg-white/4 text-text-faint hover:bg-white/8 hover:text-text"
									}`}
								>
									{cat.label}
								</button>
							))}
						</div>
					</div>

					{/* Plugin Grid */}
					<div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
						{filteredCatalog.map((plugin) => {
							const isInstalled = installed.some((p) => p.manifest.id === plugin.id);
							return (
								<PluginCard
									key={plugin.id}
									plugin={plugin}
									isInstalled={isInstalled}
									onInstall={() => installPlugin(plugin)}
								/>
							);
						})}
					</div>

					{filteredCatalog.length === 0 && (
						<div className="flex flex-col items-center justify-center py-12 text-center text-text-faint">
							<PackageIcon size={32} className="mb-2 opacity-30" />
							<p className="text-sm">未搜索到符合条件的插件</p>
							<p className="text-xs opacity-60">尝试更换搜索关键字或分类筛选</p>
						</div>
					)}
				</div>
			)}

			{/* Tab 2: Installed */}
			{tab === "installed" && (
				<div className="flex flex-col gap-3">
					{installed.map((item) => (
						<Card key={item.manifest.id} className="p-3.5">
							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-3">
									<div
										className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/6"
										style={{ color: item.manifest.accentColor }}
									>
										{renderPluginIcon(item.manifest.icon, 20)}
									</div>
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<h4 className="text-[13px] font-semibold text-text">{item.manifest.name}</h4>
											<span className="rounded bg-white/8 px-1.5 py-0.2 text-[10px] text-text-faint">
												v{item.manifest.version}
											</span>
											<span className="rounded bg-white/5 px-1.5 py-0.2 text-[10px] text-text-faint">
												{item.source === "marketplace" ? "市场下载" : "本地导入"}
											</span>
										</div>
										<p className="truncate text-xs text-text-faint">{item.manifest.description}</p>
									</div>
								</div>

								<div className="flex flex-none items-center gap-2">
									{item.manifest.settings && item.manifest.settings.length > 0 && (
										<button
											type="button"
											onClick={() => setConfiguringPlugin(item)}
											className="flex h-7 items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-2.5 text-xs text-text-faint hover:bg-white/8 hover:text-text"
										>
											<SlidersIcon size={13} />
											<span>配置</span>
										</button>
									)}
									<Toggle checked={item.enabled} onChange={() => togglePlugin(item.manifest.id)} />
									<button
										type="button"
										onClick={() => uninstallPlugin(item.manifest.id)}
										title="卸载插件"
										className="flex h-7 w-7 items-center justify-center rounded-lg text-text-faint hover:bg-red-500/10 hover:text-red-400"
									>
										<Trash2Icon size={14} />
									</button>
								</div>
							</div>
						</Card>
					))}

					{installed.length === 0 && (
						<div className="flex flex-col items-center justify-center py-12 text-center text-text-faint">
							<CheckIcon size={32} className="mb-2 opacity-30" />
							<p className="text-sm">尚未安装任何第三方插件</p>
							<button
								type="button"
								onClick={() => setTab("explore")}
								className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-text hover:bg-white/15"
							>
								前往“探索发现”浏览插件
							</button>
						</div>
					)}
				</div>
			)}

			{/* Tab 3: Sideload & Dev */}
			{tab === "sideload" && (
				<div className="flex flex-col gap-4">
					<Card className="p-4">
						<div className="flex items-start gap-3">
							<div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
								<FolderArchiveIcon size={20} />
							</div>
							<div className="flex-1">
								<h4 className="text-sm font-semibold text-text">本地导入插件包</h4>
								<p className="mt-1 text-xs text-text-faint">
									支持直接加载开发者分享的 <code>.zip</code> 插件包或 <code>manifest.json</code> 配置文件。
								</p>
								<div className="mt-3 flex items-center gap-2">
									<label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-text hover:bg-white/15">
										<DownloadIcon size={13} />
										<span>选择本地文件</span>
										<input
											type="file"
											accept=".zip,.json"
											className="hidden"
											onChange={() => alert("本地插件解析引擎就绪，可在开发者模式下加载！")}
										/>
									</label>
								</div>
							</div>
						</div>
					</Card>

					<Card className="p-4">
						<div className="flex items-start gap-3">
							<div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
								<Code2Icon size={20} />
							</div>
							<div className="flex-1">
								<h4 className="text-sm font-semibold text-text">成为插件开发者</h4>
								<p className="mt-1 text-xs text-text-faint">
									为 Windows 灵动岛编写你自己的插件极其简单，只需定义一个清晰的 JSON 清单和组件即可。
								</p>
								<div className="mt-3 rounded-lg border border-white/6 bg-black/30 p-3 font-mono text-[11px] text-white/70">
									<p className="text-amber-300">{"// 示例 island.plugin.json"}</p>
									<p>&#123;</p>
									<p className="pl-4">&quot;id&quot;: &quot;com.example.my-widget&quot;,</p>
									<p className="pl-4">&quot;name&quot;: &quot;My Custom Island Widget&quot;,</p>
									<p className="pl-4">&quot;version&quot;: &quot;1.0.0&quot;,</p>
									<p className="pl-4">&quot;category&quot;: &quot;tools&quot;</p>
									<p>&#125;</p>
								</div>
								<div className="mt-3">
									<a
										href="https://github.com/shawn89890916/windows-dynamic-island"
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
									>
										<span>查阅灵动岛插件开发官方文档</span>
										<ExternalLinkIcon size={11} />
									</a>
								</div>
							</div>
						</div>
					</Card>
				</div>
			)}

			{/* Configuration Drawer / Modal */}
			{configuringPlugin && (
				<ConfigModal
					plugin={configuringPlugin}
					onClose={() => setConfiguringPlugin(null)}
					onSave={(newSettings) => {
						updatePluginSettings(configuringPlugin.manifest.id, newSettings);
						setConfiguringPlugin(null);
					}}
				/>
			)}
		</div>
	);
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
				active ? "bg-white/12 text-white shadow-sm" : "text-text-faint hover:text-text"
			}`}
		>
			{children}
		</button>
	);
}

function PluginCard({
	plugin,
	isInstalled,
	onInstall,
}: {
	plugin: PluginManifest;
	isInstalled: boolean;
	onInstall: () => void;
}) {
	return (
		<Card className="flex flex-col justify-between p-3.5 transition-all hover:border-white/12">
			<div>
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2.5">
						<div
							className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/6"
							style={{ color: plugin.accentColor }}
						>
							{renderPluginIcon(plugin.icon, 18)}
						</div>
						<div className="min-w-0">
							<h4 className="truncate text-[13px] font-semibold text-text">{plugin.name}</h4>
							<span className="text-[11px] text-text-faint">by {plugin.author.name}</span>
						</div>
					</div>
					<span className="rounded bg-white/6 px-1.5 py-0.2 text-[10px] text-text-faint">v{plugin.version}</span>
				</div>

				<p className="mt-2.5 text-xs leading-relaxed text-text-muted">{plugin.description}</p>

				{plugin.tags && (
					<div className="mt-3 flex flex-wrap gap-1">
						{plugin.tags.map((tag) => (
							<span key={tag} className="rounded bg-white/4 px-1.5 py-0.5 text-[10px] text-text-faint">
								#{tag}
							</span>
						))}
					</div>
				)}
			</div>

			<div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3">
				<span className="text-[10px] text-text-faint">免费开源</span>
				{isInstalled ? (
					<span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
						<CheckIcon size={13} />
						已安装
					</span>
				) : (
					<button
						type="button"
						onClick={onInstall}
						className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-text transition-colors hover:bg-white/20 active:scale-95"
					>
						<DownloadIcon size={12} />
						安装
					</button>
				)}
			</div>
		</Card>
	);
}

function ConfigModal({
	plugin,
	onClose,
	onSave,
}: {
	plugin: InstalledPlugin;
	onClose: () => void;
	onSave: (settings: Record<string, unknown>) => void;
}) {
	const [values, setValues] = useState<Record<string, unknown>>({
		...plugin.customSettings,
	});

	const { manifest } = plugin;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
			<div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#18181f] p-5 shadow-2xl">
				<div className="flex items-center justify-between border-b border-white/8 pb-3">
					<div className="flex items-center gap-2">
						{renderPluginIcon(manifest.icon, 18, manifest.accentColor)}
						<h3 className="text-sm font-semibold text-text">{manifest.name} 设置</h3>
					</div>
					<button type="button" onClick={onClose} className="text-sm text-text-faint hover:text-text">
						✕
					</button>
				</div>

				<div className="my-4 flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
					{manifest.settings?.map((field) => (
						<div key={field.key} className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-text">{field.label}</span>
							{field.description && <p className="text-[11px] text-text-faint">{field.description}</p>}

							{field.type === "text" && (
								<input
									type="text"
									value={String(values[field.key] ?? field.default ?? "")}
									onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
									className="h-8 rounded-lg border border-white/8 bg-white/4 px-2.5 text-xs text-text focus:border-white/20 focus:outline-none"
								/>
							)}

							{field.type === "number" && (
								<input
									type="number"
									value={Number(values[field.key] ?? field.default ?? 0)}
									onChange={(e) => setValues({ ...values, [field.key]: Number(e.target.value) })}
									className="h-8 rounded-lg border border-white/8 bg-white/4 px-2.5 text-xs text-text focus:border-white/20 focus:outline-none"
								/>
							)}

							{field.type === "password" && (
								<input
									type="password"
									value={String(values[field.key] ?? field.default ?? "")}
									onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
									className="h-8 rounded-lg border border-white/8 bg-white/4 px-2.5 text-xs text-text focus:border-white/20 focus:outline-none"
								/>
							)}

							{field.type === "boolean" && (
								<Toggle
									checked={Boolean(values[field.key] ?? field.default ?? false)}
									onChange={(v) => setValues({ ...values, [field.key]: v })}
								/>
							)}

							{field.type === "select" && (
								<select
									value={String(values[field.key] ?? field.default ?? "")}
									onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
									className="h-8 rounded-lg border border-white/8 bg-[#202028] px-2 text-xs text-text focus:border-white/20 focus:outline-none"
								>
									{field.options?.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							)}
						</div>
					))}
				</div>

				<div className="flex items-center justify-end gap-2 border-t border-white/8 pt-3">
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-text-faint hover:bg-white/10 hover:text-text"
					>
						取消
					</button>
					<button
						type="button"
						onClick={() => onSave(values)}
						className="rounded-lg bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/25"
					>
						保存设置
					</button>
				</div>
			</div>
		</div>
	);
}
