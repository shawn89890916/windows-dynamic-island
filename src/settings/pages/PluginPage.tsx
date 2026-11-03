import {
	BookOpenIcon,
	CheckCircle2Icon,
	CheckIcon,
	ExternalLinkIcon,
	EyeIcon,
	EyeOffIcon,
	HelpCircleIcon,
	InfoIcon,
	RefreshCwIcon,
	RotateCcwIcon,
	SlidersIcon,
	SparklesIcon,
	Trash2Icon,
	XCircleIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Card, Row } from "../../components/ui/card";
import { Input, Select } from "../../components/ui/form";
import { useT } from "../../core/i18n";
import { useCatalog } from "../../core/plugins/catalog";
import {
	installPlugin,
	renderPluginIcon,
	togglePlugin,
	uninstallPlugin,
	updatePluginSettings,
	useInstalledPlugins,
} from "../../core/plugins/registry";
import { diagnosePlugin } from "../../core/plugins/runtime";
import type { PluginSettingField } from "../../core/plugins/types";
import { BackLink } from "../components/Heading";
import { PlacementSelect } from "../components/PlacementSelect";
import { Toggle } from "../components/Toggle";

export function PluginPage({
	pluginId: propPluginId,
	from = "marketplace",
	values: _propValues,
}: {
	pluginId?: string;
	from?: "modules" | "marketplace";
	values?: Record<string, unknown>;
}) {
	const t = useT();
	const navigate = useNavigate();
	const params = useParams<{ id: string }>();
	const targetId = propPluginId || params.id;

	const installed = useInstalledPlugins();
	const plugin = installed.find((p) => p.manifest.id === targetId);
	const { catalog, refresh } = useCatalog();
	useEffect(() => {
		void refresh();
	}, [refresh]);

	// Catalog fallback if not installed
	const catalogItem = catalog.find((m) => m.id === targetId);
	const manifest = plugin?.manifest || catalogItem;

	// Local states for settings and testing
	const [formValues, setFormValues] = useState<Record<string, unknown>>(() => ({
		...(plugin?.customSettings ?? {}),
	}));
	const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
	const [saveNotification, setSaveNotification] = useState(false);
	const [confirmUninstall, setConfirmUninstall] = useState(false);
	const [installing, setInstalling] = useState(false);
	const [installError, setInstallError] = useState<string | null>(null);

	// Diagnostic testing states
	const [diagLoading, setDiagLoading] = useState(false);
	const [diagResult, setDiagResult] = useState<{
		status: "success" | "error" | "info";
		message: string;
		details?: string;
	} | null>(null);

	// Synchronize when plugin changes
	useEffect(() => {
		if (plugin?.customSettings) {
			setFormValues({ ...plugin.customSettings });
		}
	}, [plugin]);

	if (!manifest) {
		return <Navigate to="/marketplace" replace />;
	}

	const title = manifest.titleKey ? t(manifest.titleKey) : manifest.name;
	const desc = manifest.descKey ? t(manifest.descKey) : manifest.description;
	const guide = manifest.guide || catalogItem?.guide;

	const handleSettingChange = (key: string, value: unknown) => {
		const updated = { ...formValues, [key]: value };
		setFormValues(updated);
		if (plugin) {
			updatePluginSettings(plugin.manifest.id, { [key]: value });
			setSaveNotification(true);
			setTimeout(() => setSaveNotification(false), 2000);
		}
	};

	const handleResetDefaults = () => {
		if (!manifest.settings) return;
		const defaults: Record<string, unknown> = {};
		for (const s of manifest.settings) {
			defaults[s.key] = s.default;
		}
		setFormValues(defaults);
		if (plugin) {
			updatePluginSettings(plugin.manifest.id, defaults);
			setSaveNotification(true);
			setTimeout(() => setSaveNotification(false), 2000);
		}
	};

	const runDiagnosticTest = async () => {
		setDiagLoading(true);
		setDiagResult(null);

		try {
			if (!plugin?.packageSha256) throw Error("请先下载并安装此插件，再运行它自己的诊断程序。");
			setDiagResult(await diagnosePlugin(plugin, formValues));
		} catch (err) {
			setDiagResult({
				status: "error",
				message: `测试异常: ${err instanceof Error ? err.message : String(err)}`,
			});
		} finally {
			setDiagLoading(false);
		}
	};

	const backTo = from === "modules" ? "/modules" : "/marketplace";
	const backLabel = from === "modules" ? t("modules.title") : "插件市场";

	return (
		<div className="flex flex-col gap-4 select-text">
			{/* Top Navigation Back link */}
			<div className="flex items-center justify-between">
				<BackLink to={backTo}>{backLabel}</BackLink>
				{saveNotification && (
					<motion.span
						initial={{ opacity: 0, x: 10 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0 }}
						className="flex items-center gap-1.5 text-xs font-medium text-emerald-400"
					>
						<CheckIcon size={13} />
						<span>已自动保存并即时生效</span>
					</motion.span>
				)}
			</div>

			{/* Plugin Banner Header */}
			<div className="flex items-start gap-4">
				<div
					className="flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ring-1 ring-white/10"
					style={{
						backgroundColor: `${manifest.accentColor || "#6366F1"}20`,
						color: manifest.accentColor || "#6366F1",
					}}
				>
					{renderPluginIcon(manifest.icon, 28, manifest.accentColor)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-xl font-bold tracking-tight text-text">{title}</h1>
						<span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-medium text-text-dim">
							v{manifest.version}
						</span>
						<span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-text-faint">
							{plugin?.source === "local" ? "本地导入" : "官方开源市场"}
						</span>
					</div>

					<p className="mt-1 text-xs text-text-dim leading-relaxed">{desc}</p>

					<div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11.5px] text-text-faint">
						<span>
							开发者:{" "}
							{manifest.author.url ? (
								<a
									href={manifest.author.url}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
								>
									<span>{manifest.author.name}</span>
									<ExternalLinkIcon size={10} />
								</a>
							) : (
								<strong className="text-text-dim font-medium">{manifest.author.name}</strong>
							)}
						</span>
						{manifest.tags && manifest.tags.length > 0 && (
							<div className="flex items-center gap-1">
								{manifest.tags.map((tag) => (
									<span key={tag} className="rounded bg-white/4 px-1.5 py-0.5 text-[10px] text-text-faint">
										#{tag}
									</span>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* If not installed, provide prompt & install button */}
			{!plugin ? (
				<Card className="p-5">
					<div className="flex flex-col items-center justify-center gap-3 text-center py-6">
						<div className="rounded-full bg-white/6 p-3 text-text-faint">
							<BookOpenIcon size={28} />
						</div>
						<h3 className="text-sm font-semibold text-text">此插件尚未安装</h3>
						<p className="max-w-md text-xs text-text-dim">
							安装后即可在灵动岛与快捷启动栏中使用此微应用，并在此处自由配置参数与查阅专属使用教程。
						</p>
						<button
							type="button"
							disabled={installing}
							onClick={async () => {
								setInstalling(true);
								setInstallError(null);
								try {
									await installPlugin(manifest);
								} catch (error) {
									setInstallError(error instanceof Error ? error.message : String(error));
								} finally {
									setInstalling(false);
								}
							}}
							className="mt-2 flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-accent-hover transition-colors"
						>
							<SparklesIcon size={14} />
							<span>{installing ? "下载并安装中…" : "下载并安装插件"}</span>
						</button>
						<p className="max-w-lg text-[11px] leading-relaxed text-text-faint">
							插件代码会在灵动岛窗口中运行，并可使用该窗口已有的系统接口与数据。仅安装你信任的发布者；更新也会单独下载并校验。
						</p>
						{installError && <p className="text-xs text-red-300">{installError}</p>}
					</div>
				</Card>
			) : (
				<>
					{/* Card 1: Core Switch & Placement Controls */}
					<Card>
						<Row
							as="label"
							label="启用此插件"
							desc={
								<span className="flex items-center gap-1.5">
									{plugin.enabled ? (
										<>
											<span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
											<span className="text-emerald-400 font-medium">已激活 · 灵动岛与抽屉正常加载</span>
										</>
									) : (
										<>
											<span className="size-2 rounded-full bg-white/20" />
											<span>已停用 · 暂时从灵动岛隐藏</span>
										</>
									)}
								</span>
							}
						>
							<Toggle checked={plugin.enabled} onChange={() => togglePlugin(manifest.id)} />
						</Row>

						<Row label={t("layout.place")} desc={t("layout.placeDesc")} disabled={!plugin.enabled}>
							<PlacementSelect moduleId={manifest.id} disabled={!plugin.enabled} />
						</Row>
					</Card>

					{/* Card 2: Parameters & Settings Form */}
					{manifest.settings && manifest.settings.length > 0 && (
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between px-1">
								<h2 className="text-xs font-bold tracking-wider text-text-faint uppercase">参数配置 (Parameters)</h2>
								<button
									type="button"
									onClick={handleResetDefaults}
									className="flex items-center gap-1 text-[11px] text-text-faint hover:text-text transition-colors"
								>
									<RotateCcwIcon size={11} />
									<span>重置为默认值</span>
								</button>
							</div>

							<Card>
								{manifest.settings.map((field) => (
									<SettingRow
										key={field.key}
										field={field}
										value={formValues[field.key] ?? field.default}
										showPassword={Boolean(showPasswords[field.key])}
										onTogglePassword={() => setShowPasswords((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
										onChange={(val) => handleSettingChange(field.key, val)}
									/>
								))}
							</Card>
						</div>
					)}

					{/* Card 3: Dedicated Tutorial & Setup Guide */}
					{guide && (
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center gap-1.5 px-1">
								<BookOpenIcon size={13} className="text-accent" />
								<h2 className="text-xs font-bold tracking-wider text-text uppercase">配置与使用教程 (Setup Guide)</h2>
							</div>

							<Card className="p-4.5">
								{/* Summary */}
								<div className="rounded-xl border border-white/6 bg-white/2 p-3 text-xs text-text-dim leading-relaxed">
									<strong className="text-text font-semibold mr-1.5">组件工作机制:</strong>
									{guide.summary}
								</div>

								{/* Prerequisites if any */}
								{guide.prerequisites && guide.prerequisites.length > 0 && (
									<div className="mt-3.5 flex flex-col gap-1.5">
										<span className="text-[11.5px] font-semibold text-text-faint flex items-center gap-1">
											<InfoIcon size={12} className="text-amber-400" />
											<span>前置准备 (Prerequisites)</span>
										</span>
										<div className="flex flex-col gap-1 pl-1">
											{guide.prerequisites.map((req) => (
												<div key={req} className="flex items-start gap-2 text-xs text-text-dim">
													<span className="size-1.5 rounded-full bg-amber-400/80 mt-1.5 shrink-0" />
													<span>{req}</span>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Step by Step Guide */}
								<div className="mt-4 flex flex-col gap-3">
									<span className="text-[11.5px] font-semibold text-text-faint">
										详细操作步骤 (Step-by-Step Instructions)
									</span>

									<div className="flex flex-col gap-2.5">
										{guide.steps.map((step, idx) => (
											<div
												key={step.title}
												className="relative flex items-start gap-3 rounded-xl border border-white/5 bg-white/2.5 p-3"
											>
												<span className="flex size-5.5 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-[11px] font-bold text-accent shadow-xs">
													{idx + 1}
												</span>
												<div className="min-w-0 flex-1">
													<div className="flex flex-wrap items-center justify-between gap-2">
														<h4 className="text-[13px] font-semibold text-text">{step.title}</h4>
														{step.link && (
															<a
																href={step.link.url}
																target="_blank"
																rel="noreferrer"
																className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
															>
																<span>{step.link.label}</span>
																<ExternalLinkIcon size={10} />
															</a>
														)}
													</div>
													<p className="mt-1 text-xs text-text-dim leading-relaxed">{step.desc}</p>
													{step.tip && (
														<div className="mt-2 rounded-lg bg-white/4 px-2.5 py-1.5 text-[11.5px] text-amber-300/90 flex items-start gap-1.5">
															<span className="font-semibold text-amber-400 shrink-0">💡 提示:</span>
															<span>{step.tip}</span>
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								</div>

								{/* Interactive Live Diagnostic Box */}
								<div className="mt-5 rounded-xl border border-white/8 bg-black/25 p-3.5">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											<SlidersIcon size={14} className="text-accent" />
											<h4 className="text-xs font-semibold text-text">连通性与服务即时诊断</h4>
										</div>
										<button
											type="button"
											disabled={diagLoading}
											onClick={runDiagnosticTest}
											className="flex h-7 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-text hover:bg-white/18 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
										>
											<RefreshCwIcon size={11} className={diagLoading ? "animate-spin" : ""} />
											<span>{diagLoading ? "正在诊断…" : "立即测试连通性"}</span>
										</button>
									</div>

									{diagResult && (
										<motion.div
											initial={{ opacity: 0, y: 4 }}
											animate={{ opacity: 1, y: 0 }}
											className={`mt-3 rounded-lg p-2.5 text-xs leading-relaxed flex items-start gap-2 ${
												diagResult.status === "success"
													? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
													: diagResult.status === "error"
														? "bg-rose-500/10 border border-rose-500/20 text-rose-300"
														: "bg-sky-500/10 border border-sky-500/20 text-sky-300"
											}`}
										>
											{diagResult.status === "success" ? (
												<CheckCircle2Icon size={15} className="shrink-0 text-emerald-400 mt-0.5" />
											) : diagResult.status === "error" ? (
												<XCircleIcon size={15} className="shrink-0 text-rose-400 mt-0.5" />
											) : (
												<InfoIcon size={15} className="shrink-0 text-sky-400 mt-0.5" />
											)}
											<div className="min-w-0 flex-1">
												<p className="font-medium">{diagResult.message}</p>
												{diagResult.details && (
													<p className="mt-1 font-mono text-[10.5px] opacity-75">{diagResult.details}</p>
												)}
											</div>
										</motion.div>
									)}
								</div>

								{/* FAQ if present */}
								{guide.faq && guide.faq.length > 0 && (
									<div className="mt-4 flex flex-col gap-2">
										<span className="text-[11.5px] font-semibold text-text-faint flex items-center gap-1">
											<HelpCircleIcon size={12} />
											<span>常见排查与问答 (Troubleshooting)</span>
										</span>
										<div className="flex flex-col gap-2">
											{guide.faq.map((item) => (
												<div key={item.q} className="rounded-lg bg-white/2 p-2.5 text-xs text-text-dim">
													<p className="font-medium text-text">Q: {item.q}</p>
													<p className="mt-1 text-text-dim">A: {item.a}</p>
												</div>
											))}
										</div>
									</div>
								)}
							</Card>
						</div>
					)}

					{/* Card 4: Danger Zone & Uninstallation */}
					<div className="flex flex-col gap-1.5 mt-2">
						<h2 className="text-xs font-bold tracking-wider text-text-faint uppercase px-1">
							元数据与管理 (Management)
						</h2>
						<Card>
							<Row label="唯一标识 (Package ID)" desc="该插件在系统注册表与设置树中的唯一命名空间">
								<span className="font-mono text-xs text-text-dim select-all bg-white/4 px-2 py-1 rounded">
									{manifest.id}
								</span>
							</Row>

							<Row label="卸载此插件" desc="从灵动岛完全卸载此扩展组件，并清理其在运行时的注册状态">
								{confirmUninstall ? (
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setConfirmUninstall(false)}
											className="h-8 rounded-lg bg-white/6 px-3 text-xs text-text-faint hover:bg-white/10"
										>
											取消
										</button>
										<button
											type="button"
											onClick={() => {
												void uninstallPlugin(manifest.id)
													.then(() => navigate("/marketplace"))
													.catch((error) => setInstallError(String(error)));
											}}
											className="flex h-8 items-center gap-1.5 rounded-lg bg-red-500/20 px-3 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
										>
											<Trash2Icon size={13} />
											<span>确认卸载</span>
										</button>
									</div>
								) : (
									<button
										type="button"
										onClick={() => setConfirmUninstall(true)}
										className="flex h-8 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/8 px-3 text-xs font-medium text-red-400 hover:bg-red-500/16 transition-colors cursor-pointer"
									>
										<Trash2Icon size={13} />
										<span>卸载插件</span>
									</button>
								)}
							</Row>
						</Card>
					</div>
				</>
			)}
		</div>
	);
}

function SettingRow({
	field,
	value,
	showPassword,
	onTogglePassword,
	onChange,
}: {
	field: PluginSettingField;
	value: unknown;
	showPassword: boolean;
	onTogglePassword: () => void;
	onChange: (val: unknown) => void;
}) {
	return (
		<Row label={field.label} desc={field.description}>
			{field.type === "text" && (
				<Input
					value={String(value ?? "")}
					onChange={(e) => onChange(e.target.value)}
					placeholder={String(field.default ?? "")}
					className="w-56"
				/>
			)}

			{field.type === "number" && (
				<Input
					type="number"
					value={Number(value ?? 0)}
					onChange={(e) => onChange(Number(e.target.value))}
					className="w-24 text-right"
				/>
			)}

			{field.type === "password" && (
				<div className="relative flex items-center">
					<Input
						type={showPassword ? "text" : "password"}
						value={String(value ?? "")}
						onChange={(e) => onChange(e.target.value)}
						placeholder="••••••••••••••••"
						className="w-56 pr-8 font-mono"
					/>
					<button
						type="button"
						onClick={onTogglePassword}
						className="absolute right-2 text-text-faint hover:text-text cursor-pointer"
						title={showPassword ? "隐藏密钥" : "显示明文"}
					>
						{showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
					</button>
				</div>
			)}

			{field.type === "boolean" && <Toggle checked={Boolean(value)} onChange={(checked) => onChange(checked)} />}

			{field.type === "select" && (
				<Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
					{field.options?.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</Select>
			)}
		</Row>
	);
}
