import { ExternalLinkIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { launchVpnApp, pingProxy, type RoutingMode } from "../vpnClient";
import { NeedsConfigCard } from "./NeedsConfigCard";

export function VpnWidget({ settings }: { settings: Record<string, unknown> }) {
	const isConfigured = Boolean(settings.configured && settings.proxyPort);
	const port = Number(settings.proxyPort || 7890);
	const clientPath = String(settings.clientPath || "").trim();
	const testUrl = String(settings.testUrl || "https://www.gstatic.com/generate_204");

	const [mode, setMode] = useState<RoutingMode>((settings.mode as RoutingMode) || "rule");
	const [latency, setLatency] = useState<number | null>(null);
	const [isPinging, setIsPinging] = useState(false);

	const handlePing = useCallback(
		async (e?: React.MouseEvent) => {
			e?.stopPropagation();
			if (isPinging) return;
			setIsPinging(true);
			const result = await pingProxy(testUrl);
			setLatency(result);
			setIsPinging(false);
		},
		[isPinging, testUrl],
	);

	useEffect(() => {
		if (isConfigured) {
			handlePing();
		}
	}, [isConfigured, handlePing]);

	if (!isConfigured) {
		return (
			<NeedsConfigCard
				pluginId="com.island.vpn"
				title="VPN 代理监控"
				description="未配置代理端口。请输入 Clash / V2Ray / Sing-box 的本地混合端口（如 7890、7897）以监控连接状态。"
				icon={<ShieldCheckIcon size={18} />}
				accentColor="#06B6D4"
				settingsDefs={[
					{
						key: "proxyPort",
						label: "本地混合代理端口 (如 7890, 7897)",
						type: "number",
						default: 7890,
					},
					{
						key: "clientPath",
						label: "客户端程序路径 (可选，用于快捷启动)",
						type: "text",
						default: "",
					},
				]}
				currentSettings={settings}
			/>
		);
	}

	const isConnected = latency !== null;

	return (
		<div className="flex h-full items-center justify-between px-3 select-none">
			{/* Leading Column: Status Badge, Latency & Quick Test */}
			<div className="flex w-[190px] shrink-0 items-center gap-3">
				<div
					className={`flex size-11.5 shrink-0 items-center justify-center rounded-2xl transition-colors ${
						isConnected ? "bg-cyan-500/18 text-cyan-400" : "bg-rose-500/18 text-rose-400"
					}`}
				>
					<ShieldCheckIcon size={24} />
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-1.5">
						<span className="text-[13px] font-semibold text-text truncate">
							{isConnected ? "代理已连接" : "未检测到代理"}
						</span>
						<span
							className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-bold ${
								isConnected ? "bg-emerald-500/18 text-emerald-400" : "bg-rose-500/18 text-rose-400"
							}`}
						>
							端口 {port}
						</span>
					</div>
					<div className="mt-0.5 flex items-baseline gap-1.5">
						<span className="font-mono text-[22px]/[1.1] font-bold text-text tabular-nums">
							{isConnected ? `${latency} ms` : "断开"}
						</span>
					</div>
					<span className="text-[11px] text-text-faint truncate">
						{isConnected ? "Google 204 延迟测试正常" : "请确认本地代理内核已启动"}
					</span>
				</div>
			</div>

			{/* Center: Mode Switcher & Re-Ping */}
			<div className="flex flex-col items-center gap-1.5 border-x border-white/8 px-4">
				<div className="flex items-center gap-1 rounded-xl bg-white/6 p-0.5">
					{(["rule", "global", "direct"] as RoutingMode[]).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => setMode(m)}
							className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
								mode === m ? "bg-cyan-500 text-white shadow-sm" : "text-text-faint hover:text-text"
							}`}
						>
							{m === "rule" ? "规则" : m === "global" ? "全局" : "直连"}
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={handlePing}
					disabled={isPinging}
					className="flex items-center gap-1 text-[11px] text-text-faint hover:text-text transition-colors mt-0.5"
				>
					<RefreshCwIcon size={11} className={isPinging ? "animate-spin text-cyan-400" : ""} />
					<span>{isPinging ? "正在测速..." : "重新测速"}</span>
				</button>
			</div>

			{/* Trailing: Client Launcher */}
			<div className="flex flex-col items-end gap-1.5 pl-2">
				{clientPath && (
					<button
						type="button"
						onClick={() => launchVpnApp(clientPath)}
						className="flex items-center gap-1.5 rounded-full bg-white/8 hover:bg-white/14 px-3 py-1.5 text-xs font-semibold text-text transition-colors"
					>
						<span>打开代理软件</span>
						<ExternalLinkIcon size={12} className="opacity-60" />
					</button>
				)}
				<span className="text-[10px] text-text-faint font-mono">
					{isConnected ? "真实网络环境已接管" : "检查端口与防火墙"}
				</span>
			</div>
		</div>
	);
}
