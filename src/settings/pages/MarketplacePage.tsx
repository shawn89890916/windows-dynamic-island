import {
	CheckIcon,
	Code2Icon,
	DownloadIcon,
	ExternalLinkIcon,
	FolderArchiveIcon,
	GlobeIcon,
	PackageIcon,
	SearchIcon,
	SlidersIcon,
	SparklesIcon,
	Trash2Icon,
	UploadCloudIcon,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "../../components/ui/card";
import { useT } from "../../core/i18n";
import { MARKETPLACE_CATALOG } from "../../core/plugins/catalog";
import {
	installPlugin,
	renderPluginIcon,
	togglePlugin,
	uninstallPlugin,
	useInstalledPlugins,
} from "../../core/plugins/registry";
import type { PluginCategory, PluginManifest } from "../../core/plugins/types";
import { Lead, Title } from "../components/Heading";
import { Toggle } from "../components/Toggle";

const CATEGORIES: { id: PluginCategory | "all"; label: string }[] = [
	{ id: "all", label: "全部分类" },
	{ id: "productivity", label: "效率工作" },
	{ id: "tools", label: "实用工具" },
	{ id: "media", label: "媒体娱乐" },
];

export function MarketplacePage() {
	const t = useT();
	const navigate = useNavigate();
	const [tab, setTab] = useState<"explore" | "installed" | "sideload">("explore");
	const [search, setSearch] = useState("");
	const [activeCategory, setActiveCategory] = useState<PluginCategory | "all">("all");

	// Direct sideload & install state
	const [importUrl, setImportUrl] = useState("");
	const [importLoading, setImportLoading] = useState(false);
	const [importError, setImportError] = useState<string | null>(null);
	const [importSuccess, setImportSuccess] = useState<string | null>(null);

	const installed = useInstalledPlugins();

	const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setImportError(null);
		setImportSuccess(null);
		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const content = event.target?.result as string;
				const manifest = JSON.parse(content) as PluginManifest;
				if (!manifest.id || !manifest.name) {
					throw new Error("清单缺少必填字段 (id, name)");
				}
				installPlugin(manifest, "local");
				setImportSuccess(`成功安装本地插件：${manifest.name}`);
				setTimeout(() => {
					setTab("installed");
					setImportSuccess(null);
				}, 1200);
			} catch (err) {
				setImportError(`解析失败: ${err instanceof Error ? err.message : String(err)}`);
			}
		};
		reader.readAsText(file);
	};

	const handleUrlImport = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!importUrl.trim()) return;
		setImportLoading(true);
		setImportError(null);
		setImportSuccess(null);
		try {
			const res = await fetch(importUrl.trim());
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const manifest = (await res.json()) as PluginManifest;
			if (!manifest.id || !manifest.name) {
				throw new Error("清单缺少必填字段 (id, name)");
			}
			installPlugin(manifest, "marketplace");
			setImportSuccess(`成功安装远程插件：${manifest.name}`);
			setImportUrl("");
			setTimeout(() => {
				setTab("installed");
				setImportSuccess(null);
			}, 1200);
		} catch (err) {
			setImportError(`加载失败: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			setImportLoading(false);
		}
	};

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
									onConfigure={() => navigate(`/plugins/${plugin.id}`)}
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
						<Card key={item.manifest.id} className="p-3.5 overflow-hidden transition-all hover:border-white/12">
							<div className="flex items-center justify-between gap-3 min-w-0">
								<div
									className="group/item flex min-w-0 flex-1 items-center gap-3 cursor-pointer"
									onClick={() => navigate(`/plugins/${item.manifest.id}`)}
								>
									<div
										className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/6 transition-transform group-hover/item:scale-105"
										style={{ color: item.manifest.accentColor }}
									>
										{renderPluginIcon(item.manifest.icon, 20)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<h4 className="truncate text-[13px] font-semibold text-text group-hover/item:text-accent transition-colors">
												{item.manifest.titleKey ? t(item.manifest.titleKey) : item.manifest.name}
											</h4>
											<span className="flex-none rounded bg-white/8 px-1.5 py-0.2 text-[10px] text-text-faint">
												v{item.manifest.version}
											</span>
											<span className="flex-none rounded bg-white/5 px-1.5 py-0.2 text-[10px] text-text-faint">
												{item.source === "marketplace" ? "市场下载" : "本地导入"}
											</span>
										</div>
										<p className="truncate text-xs text-text-faint">
											{item.manifest.descKey ? t(item.manifest.descKey) : item.manifest.description}
										</p>
									</div>
								</div>

								<div className="flex flex-none items-center gap-2">
									<button
										type="button"
										onClick={() => navigate(`/plugins/${item.manifest.id}`)}
										className="flex h-7 items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-2.5 text-xs text-text-faint hover:bg-white/10 hover:text-text transition-colors cursor-pointer"
									>
										<SlidersIcon size={13} />
										<span>配置</span>
									</button>
									<Toggle checked={item.enabled} onChange={() => togglePlugin(item.manifest.id)} />
									<button
										type="button"
										onClick={() => uninstallPlugin(item.manifest.id)}
										title="卸载插件"
										className="flex h-7 w-7 items-center justify-center rounded-lg text-text-faint hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
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
					{/* Status feedback */}
					{importSuccess && (
						<div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs text-emerald-400 flex items-center gap-2">
							<CheckIcon size={14} />
							<span>{importSuccess}</span>
						</div>
					)}
					{importError && (
						<div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-xs text-rose-400">
							{importError}
						</div>
					)}

					{/* 1. Direct URL Installation */}
					<Card className="p-4">
						<div className="flex items-start gap-3">
							<div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
								<GlobeIcon size={20} />
							</div>
							<div className="flex-1">
								<h4 className="text-sm font-semibold text-text">远程 URL 直装（零审核，直接生效）</h4>
								<p className="mt-1 text-xs text-text-faint">
									无需等待任何官方审核！输入任何 GitHub Raw、Gist 或自建服务器上的 <code>island.plugin.json</code>{" "}
									链接，即可瞬间直装到灵动岛。
								</p>
								<form onSubmit={handleUrlImport} className="mt-3 flex items-center gap-2">
									<input
										type="url"
										value={importUrl}
										onChange={(e) => setImportUrl(e.target.value)}
										placeholder="https://raw.githubusercontent.com/.../island.plugin.json"
										className="h-8.5 flex-1 rounded-lg border border-white/8 bg-white/4 px-3 text-xs text-text placeholder:text-text-faint focus:border-white/20 focus:outline-none"
									/>
									<button
										type="submit"
										disabled={importLoading || !importUrl.trim()}
										className="flex h-8.5 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
									>
										<UploadCloudIcon size={13} />
										<span>{importLoading ? "加载中…" : "一键直装"}</span>
									</button>
								</form>
							</div>
						</div>
					</Card>

					{/* 2. Local File Sideload */}
					<Card className="p-4">
						<div className="flex items-start gap-3">
							<div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
								<FolderArchiveIcon size={20} />
							</div>
							<div className="flex-1">
								<h4 className="text-sm font-semibold text-text">本地导入插件包</h4>
								<p className="mt-1 text-xs text-text-faint">
									支持直接加载本地正在编写或调试的 <code>manifest.json</code> 配置文件。
								</p>
								<div className="mt-3 flex items-center gap-2">
									<label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-text hover:bg-white/15">
										<DownloadIcon size={13} />
										<span>选择本地 manifest.json 文件</span>
										<input type="file" accept=".json" className="hidden" onChange={handleFileImport} />
									</label>
								</div>
							</div>
						</div>
					</Card>

					{/* 3. Direct Publishing Guide */}
					<Card className="p-4">
						<div className="flex items-start gap-3">
							<div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
								<SparklesIcon size={20} />
							</div>
							<div className="flex-1">
								<h4 className="text-sm font-semibold text-text">如何直接上架插件？</h4>
								<p className="mt-1 text-xs text-text-faint">
									灵动岛采用开放生态设计，<strong>无需通过任何繁琐审核</strong>即可直接上架：
								</p>
								<div className="mt-2.5 flex flex-col gap-2 text-xs text-text-muted">
									<div className="flex items-start gap-2">
										<span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] font-bold text-text-dim">
											1
										</span>
										<span>
											<strong>官方市场直接合入</strong>：在仓库 <code>src/core/plugins/catalog.ts</code>{" "}
											添加一条插件清单，提交后自动直接上架。
										</span>
									</div>
									<div className="flex items-start gap-2">
										<span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] font-bold text-text-dim">
											2
										</span>
										<span>
											<strong>社区去中心化直装</strong>：只需将你的插件 JSON 发布在任意公开链接（如
											GitHub），分享给用户通过“远程 URL 直装”输入即可立即生效。
										</span>
									</div>
								</div>

								<div className="mt-3 rounded-lg border border-white/6 bg-black/30 p-3 font-mono text-[11px] text-white/70">
									<p className="text-amber-300">{"// 插件清单格式示例 island.plugin.json"}</p>
									<p>&#123;</p>
									<p className="pl-4">&quot;id&quot;: &quot;com.example.my-widget&quot;,</p>
									<p className="pl-4">&quot;name&quot;: &quot;My Custom Island Widget&quot;,</p>
									<p className="pl-4">&quot;version&quot;: &quot;1.0.0&quot;,</p>
									<p className="pl-4">&quot;category&quot;: &quot;tools&quot;,</p>
									<p className="pl-4">&quot;description&quot;: &quot;自定义微应用组件&quot;</p>
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
	onConfigure,
}: {
	plugin: PluginManifest;
	isInstalled: boolean;
	onInstall: () => void;
	onConfigure?: () => void;
}) {
	const t = useT();
	const title = plugin.titleKey ? t(plugin.titleKey) : plugin.name;
	const desc = plugin.descKey ? t(plugin.descKey) : plugin.description;
	return (
		<Card className="flex flex-col justify-between p-3.5 transition-all hover:border-white/12">
			<div>
				<div className="flex items-start justify-between gap-2">
					<div
						className={`flex items-center gap-2.5 ${isInstalled ? "cursor-pointer group/card" : ""}`}
						onClick={isInstalled ? onConfigure : undefined}
					>
						<div
							className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/6"
							style={{ color: plugin.accentColor }}
						>
							{renderPluginIcon(plugin.icon, 18)}
						</div>
						<div className="min-w-0">
							<h4
								className={`truncate text-[13px] font-semibold text-text ${
									isInstalled ? "group-hover/card:text-accent transition-colors" : ""
								}`}
							>
								{title}
							</h4>
							<span className="text-[11px] text-text-faint">by {plugin.author.name}</span>
						</div>
					</div>
					<span className="rounded bg-white/6 px-1.5 py-0.2 text-[10px] text-text-faint">v{plugin.version}</span>
				</div>

				<p className="mt-2.5 text-xs leading-relaxed text-text-muted">{desc}</p>

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
					<div className="flex items-center gap-2">
						<span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
							<CheckIcon size={13} />
							已安装
						</span>
						{onConfigure && (
							<button
								type="button"
								onClick={onConfigure}
								className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-text transition-colors hover:bg-white/20 active:scale-95 cursor-pointer"
							>
								<SlidersIcon size={12} />
								<span>配置</span>
							</button>
						)}
					</div>
				) : (
					<button
						type="button"
						onClick={onInstall}
						className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-text transition-colors hover:bg-white/20 active:scale-95 cursor-pointer"
					>
						<DownloadIcon size={12} />
						安装
					</button>
				)}
			</div>
		</Card>
	);
}
