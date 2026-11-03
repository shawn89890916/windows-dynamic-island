import {
	CheckCircle2Icon,
	CheckIcon,
	CircleIcon,
	ExternalLinkIcon,
	RefreshCwIcon,
	ShieldCheckIcon,
	SlidersIcon,
} from "lucide-react";
import { Button, IconButton } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Segmented, Select } from "../../../components/ui/form";
import { Toggle } from "../../../settings/components/Toggle";
import { command } from "../../bridge";
import { updatePluginSettings } from "../registry";
import { useVpn } from "../useVpn";
import { fastestNodes, launchVpnApp } from "../vpnClient";

export function VpnWidget({ settings }: { settings: Record<string, unknown> }) {
	const vpn = useVpn();
	const current = vpn.snapshot?.proxies[vpn.group]?.now;
	const fastest = fastestNodes(vpn.nodes, vpn.config.topCount);
	const currentNode = vpn.nodes.find((n) => n.name === current);
	const rows = currentNode && !fastest.some((n) => n.name === current) ? [currentNode, ...fastest] : fastest;
	const openSettings = () => {
		localStorage.setItem("settings_navigate", "/plugins/com.island.vpn");
		void command("open_settings");
	};
	return (
		<section className="flex h-full flex-col gap-2.5 px-1 text-[12px] leading-[1.4]" aria-label="VPN 节点控制">
			<header className="flex shrink-0 items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					<ShieldCheckIcon size={16} className="shrink-0 text-cyan-300" />
					<h2 className="text-[14px] font-[650]">VPN</h2>
					<span className="rounded-full bg-white/6 px-2 py-0.5 text-[10.5px] text-text-dim" role="status">
						{vpn.error ? "连接异常" : vpn.snapshot ? "节点监控" : "等待连接"}
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						onClick={() => void vpn.refresh()}
						disabled={vpn.busy}
						aria-label="立即测速"
						className="h-7 gap-1.5 px-3 text-[11px]"
					>
						<RefreshCwIcon size={12} className={vpn.busy ? "animate-spin" : ""} />
						{vpn.busy ? "测速中…" : "重新测速"}
					</Button>
					{Boolean(settings.clientPath) && (
						<IconButton
							size="sm"
							onClick={() => void launchVpnApp(String(settings.clientPath))}
							aria-label="打开代理软件"
							title="打开代理软件"
						>
							<ExternalLinkIcon size={13} />
						</IconButton>
					)}
					<IconButton size="sm" onClick={openSettings} aria-label="VPN 连接设置" title="连接设置">
						<SlidersIcon size={14} />
					</IconButton>
				</div>
			</header>
			{vpn.error && (
				<p className="shrink-0 rounded-lg bg-white/4 px-2.5 py-1.5 text-[11px] text-danger" role="alert">
					{vpn.error}
				</p>
			)}
			{vpn.notice && (
				<p className="shrink-0 text-[11px] text-text-dim" role="status">
					{vpn.notice}
				</p>
			)}
			<div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)] gap-2.5">
				<Card className="flex min-h-0 flex-col justify-between gap-2 px-3 py-2.5" aria-label="当前连接">
					<div>
						<p className="text-[10.5px] font-semibold text-text-dim">当前节点</p>
						<p className="mt-1 truncate text-[12px] font-semibold" title={current}>
							{current || "尚未连接"}
						</p>
						<div className="mt-1.5 flex items-baseline gap-1.5 tabular-nums">
							<span className="text-[27px]/none font-semibold tracking-tight">{currentNode?.delay ?? "—"}</span>
							<span className="text-[11px] text-text-dim">
								{currentNode?.delay != null ? "ms" : vpn.busy ? "测试中" : "暂无延迟"}
							</span>
						</div>
					</div>
					{vpn.snapshot ? (
						<>
							<div className="min-w-0 space-y-1 [&>span]:w-full">
								<label htmlFor="vpn-group" className="text-[10.5px] text-text-dim">
									策略组
								</label>
								<Select
									id="vpn-group"
									size="sm"
									aria-label="策略组"
									value={vpn.group}
									disabled={vpn.busy || vpn.snapshot.mode === "global"}
									onChange={(e) => updatePluginSettings("com.island.vpn", { proxyGroup: e.target.value })}
									className="w-full text-[11px]"
								>
									{Object.values(vpn.snapshot.proxies)
										.filter((p) => p.type === "Selector")
										.map((p) => (
											<option key={p.name} value={p.name}>
												{p.name}
											</option>
										))}
								</Select>
							</div>
							<Segmented
								options={[
									{ value: "rule", label: "规则" },
									{ value: "global", label: "全局" },
									{ value: "direct", label: "直连" },
								]}
								value={vpn.snapshot.mode}
								onChange={(mode) => void vpn.change("mode", mode)}
								disabled={vpn.busy}
							/>
						</>
					) : (
						<Button onClick={openSettings} className="h-7 justify-center px-2 text-[11px]">
							配置连接
						</Button>
					)}
				</Card>
				<Card className="flex min-h-0 flex-col px-2.5 py-2" aria-label="最快节点">
					<div className="flex h-6 shrink-0 items-center justify-between px-1">
						<h3 className="text-[11px] font-semibold">
							最快节点 <span className="ml-1 font-normal text-text-dim">{fastest.length ? fastest.length : ""}</span>
						</h3>
						<span className="text-[10px] text-text-dim">延迟 / 候选</span>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto" data-scroll data-no-drag>
						<ul>
							{rows.map((node) => {
								const selected = node.name === current;
								const fallback = vpn.config.fallbackNodes.includes(node.name);
								return (
									<li
										key={node.name}
										className={`flex min-h-8 items-center gap-2 rounded-lg px-1 ${selected ? "bg-white/7" : "hover:bg-white/4"}`}
									>
										<button
											type="button"
											disabled={vpn.busy || selected}
											onClick={() => void vpn.change("select", node.name)}
											className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
											title={node.name}
											aria-label={`切换到 ${node.name}`}
										>
											{selected ? (
												<CheckIcon size={12} className="shrink-0 text-cyan-300" />
											) : (
												<span className="w-3 shrink-0 text-[10px] tabular-nums text-text-dim">
													{fastest.findIndex((n) => n.name === node.name) + 1}
												</span>
											)}
											<span className="truncate text-[11.5px]">{node.name}</span>
										</button>
										<span
											className={`shrink-0 font-mono text-[10.5px] tabular-nums ${node.delay === null ? "text-danger" : "text-text-dim"}`}
										>
											{node.delay === null ? "超时" : `${node.delay} ms`}
										</span>
										<IconButton
											size="sm"
											role="checkbox"
											aria-checked={fallback}
											aria-label={`候选节点 ${node.name}`}
											title={fallback ? "已加入自动切换候选" : "加入自动切换候选"}
											onClick={() =>
												updatePluginSettings("com.island.vpn", {
													fallbackNodes: (fallback
														? vpn.config.fallbackNodes.filter((n) => n !== node.name)
														: [...vpn.config.fallbackNodes, node.name]
													).join(","),
												})
											}
										>
											{fallback ? <CheckCircle2Icon size={14} className="text-cyan-300" /> : <CircleIcon size={14} />}
										</IconButton>
									</li>
								);
							})}
						</ul>
						{!rows.length && (
							<div className="flex h-full min-h-16 items-center px-2 text-[11px]/relaxed text-text-dim">
								{vpn.busy
									? "正在测量节点延迟…"
									: vpn.updatedAt
										? "本轮节点均超时或不可用"
										: "连接本机控制器后，将显示最快的可用节点。"}
							</div>
						)}
					</div>
				</Card>
			</div>
			<footer className="flex shrink-0 items-center justify-between gap-3 px-1 text-[10.5px] text-text-dim">
				<label className="flex cursor-pointer items-center gap-2">
					<Toggle
						checked={vpn.config.autoSwitch}
						onChange={(value) => updatePluginSettings("com.island.vpn", { autoSwitch: value })}
					/>
					<span>
						故障时自动切换 <span className="ml-1 text-text-faint">仅 {vpn.config.fallbackNodes.length} 个候选</span>
					</span>
				</label>
				<span className="font-mono tabular-nums">
					{vpn.busy
						? "测速中"
						: vpn.nextAt
							? `下次 ${new Date(vpn.nextAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
							: `${vpn.config.interval / 1000}s / 次`}
				</span>
			</footer>
		</section>
	);
}
