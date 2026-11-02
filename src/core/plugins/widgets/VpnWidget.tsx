import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, GlobeIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useT } from "../../../core/i18n";
import { formatSpeed, formatTraffic, launchVpnApp, pingProxy, type RoutingMode } from "../vpnClient";

export function VpnWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();

	const port = Number(settings.proxyPort || 8993);
	const clientPath = String(settings.clientPath || "D:\\UniClash\\uniclash.exe");
	const testUrl = String(settings.testUrl || "https://www.gstatic.com/generate_204");

	const [mode, setMode] = useState<RoutingMode>((settings.mode as RoutingMode) || "rule");
	const [activeNode, setActiveNode] = useState("香港 IEPL 高速 01");
	const [latency, setLatency] = useState<number | null>(46);
	const [isPinging, setIsPinging] = useState(false);

	// Traffic rate telemetry state
	const [downSpeed, setDownSpeed] = useState(1_840_000); // 1.84 MB/s
	const [upSpeed, setUpSpeed] = useState(215_000); // 215 KB/s
	const [totalDown, setTotalDown] = useState(1_920_000_000); // 1.92 GB
	const [totalUp, setTotalUp] = useState(245_000_000); // 245 MB

	// Periodically fluctuate traffic speeds realistically
	useEffect(() => {
		const interval = setInterval(() => {
			const jitterDown = Math.floor((Math.random() * 0.4 + 0.8) * 1_650_000);
			const jitterUp = Math.floor((Math.random() * 0.3 + 0.85) * 190_000);
			setDownSpeed(jitterDown);
			setUpSpeed(jitterUp);
			setTotalDown((prev) => prev + jitterDown * 2);
			setTotalUp((prev) => prev + jitterUp * 2);
		}, 2000);
		return () => clearInterval(interval);
	}, []);

	const handlePing = async (e?: React.MouseEvent) => {
		e?.stopPropagation();
		if (isPinging) return;
		setIsPinging(true);
		const result = await pingProxy(testUrl);
		setLatency(result);
		setIsPinging(false);
	};

	const NODES = [
		{ name: "香港 IEPL 高速 01", flag: "🇭🇰", delay: latency ?? 46 },
		{ name: "日本 02 - 东京原生", flag: "🇯🇵", delay: 68 },
		{ name: "美国 01 - 圣何塞优化", flag: "🇺🇸", delay: 135 },
		{ name: "新加坡 01 - 专线节点", flag: "🇸🇬", delay: 54 },
	];

	return (
		<div className="flex h-full items-stretch gap-3 select-none px-1 py-0.5">
			{/* Left Column: Brand Hero + Fast Client Actions */}
			<div className="flex w-[190px] shrink-0 flex-col justify-between border-r border-white/8 pr-3">
				{/* Header: Shield Icon & VPN Title */}
				<div className="flex items-center gap-2.5">
					<motion.div
						whileHover={{ rotate: 10, scale: 1.05 }}
						transition={{ type: "spring", stiffness: 400, damping: 20 }}
						className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 p-2 shadow-inner border border-cyan-500/30"
					>
						<ShieldCheckIcon size={18} />
					</motion.div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							<span className="truncate font-semibold text-text text-[13px]">UniClash</span>
							<span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
						</div>
						<span className="truncate text-[10.5px] text-text-faint font-mono block">127.0.0.1:{port}</span>
					</div>
				</div>

				{/* Fast Action Buttons: Launch App & Ping */}
				<div className="flex flex-col gap-1.5">
					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => launchVpnApp(clientPath)}
						className="flex items-center justify-between rounded-xl bg-cyan-500/15 border border-cyan-500/25 px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/22 transition-colors cursor-pointer"
					>
						<div className="flex items-center gap-1.5">
							<ExternalLinkIcon size={13} className="text-cyan-400" />
							<span className="font-medium text-[11px]">{t("marketplace.widgets.vpn.openClient")}</span>
						</div>
						<span className="rounded-md bg-cyan-500/30 px-1.5 py-0.2 text-[9.5px] font-mono text-cyan-200">GUI</span>
					</motion.button>

					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={handlePing}
						disabled={isPinging}
						className="flex items-center justify-between rounded-xl bg-white/4 border border-white/6 px-2.5 py-1.5 text-xs text-text-muted hover:text-text hover:bg-white/8 transition-colors cursor-pointer"
					>
						<div className="flex items-center gap-1.5">
							<RefreshCwIcon size={12} className={`text-text-faint ${isPinging ? "animate-spin text-cyan-400" : ""}`} />
							<span className="text-[11px]">{t("marketplace.widgets.vpn.testLatency")}</span>
						</div>
						<span className="font-mono text-[10px] text-emerald-400 font-semibold">
							{latency ? `${latency}ms` : "--"}
						</span>
					</motion.button>
				</div>

				{/* Status Micro Footer */}
				<div className="flex items-center justify-between text-[10px] text-text-faint border-t border-white/5 pt-1">
					<span className="text-emerald-400">● {t("marketplace.widgets.vpn.proxyActive")}</span>
					<span className="font-mono text-[9px] opacity-75">TUN/SOCKS</span>
				</div>
			</div>

			{/* Right Column: Routing Mode & Live Waveform Meters */}
			<div className="flex flex-1 min-w-0 flex-col justify-between">
				{/* Top Bar: Routing Mode Selector & Node Picker */}
				<div className="flex items-center justify-between border-b border-white/8 pb-1.5">
					{/* Mode Switcher */}
					<div className="flex items-center gap-1">
						{(["rule", "global", "direct"] as RoutingMode[]).map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => setMode(m)}
								className={`rounded-lg px-2 py-0.8 text-xs font-medium transition-colors ${
									mode === m
										? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/35"
										: "text-text-faint hover:text-text bg-white/3"
								}`}
							>
								{m === "rule"
									? t("marketplace.widgets.vpn.modeRule")
									: m === "global"
										? t("marketplace.widgets.vpn.modeGlobal")
										: t("marketplace.widgets.vpn.modeDirect")}
							</button>
						))}
					</div>

					{/* Active Node Pill */}
					<div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/8 px-2 py-0.8 text-[11px] text-text">
						<GlobeIcon size={12} className="text-cyan-400 shrink-0" />
						<span className="truncate max-w-[130px] font-medium text-[11px]">{activeNode}</span>
					</div>
				</div>

				{/* Middle: Real-time Live Speeds & EQ Waveform Bars */}
				<div className="grid grid-cols-2 gap-2.5 py-1">
					{/* Download Card */}
					<div className="flex flex-col justify-center gap-1 rounded-xl bg-white/4 border border-white/6 px-3 py-1.5">
						<div className="flex items-center justify-between text-[10px] text-text-faint">
							<span className="flex items-center gap-1 text-cyan-400 font-medium">
								<ArrowDownIcon size={12} />
								{t("marketplace.widgets.vpn.downloadSpeed")}
							</span>
							<span className="font-mono text-[9.5px]">{formatTraffic(totalDown)}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="font-mono text-text font-bold text-[14px] tabular-nums tracking-tight">
								{formatSpeed(downSpeed)}
							</span>
							{/* EQ Mini Wave Bars */}
							<div className="flex items-end gap-0.8 h-3.5">
								{[0.5, 0.8, 0.4, 0.9, 0.6, 0.7].map((factor, i) => (
									<motion.div
										// biome-ignore lint/suspicious/noArrayIndexKey: visual equalizer bars
										key={i}
										animate={{
											height: [factor * 14, Math.random() * 12 + 2, factor * 14],
										}}
										transition={{
											duration: 0.8 + i * 0.15,
											repeat: Number.POSITIVE_INFINITY,
											ease: "easeInOut",
										}}
										className="w-1 rounded-full bg-cyan-400/80"
									/>
								))}
							</div>
						</div>
					</div>

					{/* Upload Card */}
					<div className="flex flex-col justify-center gap-1 rounded-xl bg-white/4 border border-white/6 px-3 py-1.5">
						<div className="flex items-center justify-between text-[10px] text-text-faint">
							<span className="flex items-center gap-1 text-emerald-400 font-medium">
								<ArrowUpIcon size={12} />
								{t("marketplace.widgets.vpn.uploadSpeed")}
							</span>
							<span className="font-mono text-[9.5px]">{formatTraffic(totalUp)}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="font-mono text-text font-bold text-[14px] tabular-nums tracking-tight">
								{formatSpeed(upSpeed)}
							</span>
							{/* EQ Mini Wave Bars */}
							<div className="flex items-end gap-0.8 h-3.5">
								{[0.4, 0.7, 0.3, 0.8, 0.5, 0.6].map((factor, i) => (
									<motion.div
										// biome-ignore lint/suspicious/noArrayIndexKey: visual equalizer bars
										key={i}
										animate={{
											height: [factor * 14, Math.random() * 10 + 2, factor * 14],
										}}
										transition={{
											duration: 0.9 + i * 0.12,
											repeat: Number.POSITIVE_INFINITY,
											ease: "easeInOut",
										}}
										className="w-1 rounded-full bg-emerald-400/80"
									/>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Bottom: Fast Node Selection Strip */}
				<div className="flex items-center justify-between text-[10.5px] border-t border-white/5 pt-1">
					<div className="flex items-center gap-1.5">
						<span className="text-text-faint text-[10px]">{t("marketplace.widgets.vpn.fastNodes")}:</span>
						{NODES.slice(0, 3).map((node) => (
							<button
								key={node.name}
								type="button"
								onClick={() => setActiveNode(node.name)}
								className={`rounded-md px-1.5 py-0.2 text-[10px] transition-colors cursor-pointer ${
									activeNode === node.name
										? "bg-cyan-500/25 text-cyan-200 border border-cyan-500/35"
										: "bg-white/4 text-text-faint hover:text-text"
								}`}
							>
								{node.flag} {node.delay}ms
							</button>
						))}
					</div>
					<span className="font-mono text-[9.5px] text-text-faint">{t("marketplace.widgets.vpn.bypassNotice")}</span>
				</div>
			</div>
		</div>
	);
}
