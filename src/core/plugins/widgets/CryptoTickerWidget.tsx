import { ArrowDownRightIcon, ArrowUpRightIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { useT } from "../../../core/i18n";

interface CryptoItem {
	symbol: string;
	name: string;
	pair: string;
	price: string;
	change: number;
	high24h: string;
	low24h: string;
	color: string;
	glyph: string;
}

const DEFAULT_ITEMS: CryptoItem[] = [
	{
		symbol: "BTC",
		name: "Bitcoin",
		pair: "BTC / USD",
		price: "$88,420.50",
		change: 3.42,
		high24h: "$89,200",
		low24h: "$85,310",
		color: "#F7931A",
		glyph: "₿",
	},
	{
		symbol: "ETH",
		name: "Ethereum",
		pair: "ETH / USD",
		price: "$3,315.80",
		change: 2.15,
		high24h: "$3,350",
		low24h: "$3,210",
		color: "#627EEA",
		glyph: "Ξ",
	},
	{
		symbol: "SOL",
		name: "Solana",
		pair: "SOL / USD",
		price: "$182.40",
		change: -1.28,
		high24h: "$188",
		low24h: "$179",
		color: "#14F195",
		glyph: "◎",
	},
	{
		symbol: "NVDA",
		name: "Nvidia",
		pair: "NVDA / USD",
		price: "$139.20",
		change: 4.35,
		high24h: "$141",
		low24h: "$134",
		color: "#76B900",
		glyph: "▲",
	},
];

export function CryptoTickerWidget({ settings: _settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const [items, setItems] = useState<CryptoItem[]>(DEFAULT_ITEMS);
	const [activeSymbol, setActiveSymbol] = useState("BTC");
	const [refreshing, setRefreshing] = useState(false);

	const activeItem = items.find((i) => i.symbol === activeSymbol) ?? items[0];

	const handleRefresh = (e: React.MouseEvent) => {
		e.stopPropagation();
		setRefreshing(true);
		setTimeout(() => {
			setItems((prev) =>
				prev.map((item) => {
					const delta = (Math.random() - 0.48) * 0.4;
					const newChange = Number((item.change + delta).toFixed(2));
					return { ...item, change: newChange };
				}),
			);
			setRefreshing(false);
		}, 350);
	};

	const isPos = activeItem.change >= 0;

	return (
		<div className="flex h-full flex-col justify-between px-3 py-1.5 select-none">
			{/* Top Hero Row: Crisp Active Asset Spotlight */}
			<div className="flex items-center justify-between border-b border-white/8 pb-2.5">
				<div className="flex items-center gap-3 min-w-0">
					{/* Brand Squircle with Glyph */}
					<div
						className="flex size-10.5 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md"
						style={{ backgroundColor: `${activeItem.color}28`, color: activeItem.color }}
					>
						{activeItem.glyph}
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<span className="text-sm font-bold text-white font-mono tracking-tight">{activeItem.pair}</span>
							<span className="size-1.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
							<span className="text-xs text-text-faint truncate">({activeItem.name})</span>
						</div>
						<div className="flex items-center gap-2 text-[11px] font-mono text-text-faint mt-0.5">
							<span>
								{t("marketplace.widgets.crypto.high")}:{" "}
								<span className="font-semibold text-text">{activeItem.high24h}</span>
							</span>
							<span className="opacity-40">·</span>
							<span>
								{t("marketplace.widgets.crypto.low")}:{" "}
								<span className="font-semibold text-text">{activeItem.low24h}</span>
							</span>
						</div>
					</div>
				</div>

				{/* Big Crisp Live Price & Glowing Change Pill */}
				<div className="flex shrink-0 items-center gap-3">
					<div className="text-right">
						<div className="font-mono text-[24px]/[1.1] font-bold tracking-tight text-white tabular-nums drop-shadow-sm">
							{activeItem.price}
						</div>
						<div className="mt-0.5 flex items-center justify-end">
							<span
								className={`flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold whitespace-nowrap shadow-sm border ${
									isPos
										? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
										: "bg-rose-500/20 text-rose-400 border-rose-500/30"
								}`}
							>
								{isPos ? <ArrowUpRightIcon size={12} /> : <ArrowDownRightIcon size={12} />}
								<span>
									{isPos ? "+" : ""}
									{activeItem.change}%
								</span>
							</span>
						</div>
					</div>

					<button
						type="button"
						onClick={handleRefresh}
						title={t("marketplace.widgets.crypto.refresh")}
						className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-text-faint transition-all hover:bg-white/18 hover:text-white active:scale-95 border border-white/8"
					>
						<RefreshCwIcon size={13} className={refreshing ? "animate-spin text-emerald-400" : ""} />
					</button>
				</div>
			</div>

			{/* Bottom Grid: High-Contrast 4-Asset Cards */}
			<div className="grid grid-cols-4 gap-2.5 pt-2">
				{items.map((item) => {
					const isSelected = item.symbol === activeSymbol;
					const pos = item.change >= 0;
					return (
						<button
							key={item.symbol}
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setActiveSymbol(item.symbol);
							}}
							className={`flex flex-col justify-between rounded-xl p-2.5 text-left transition-all ${
								isSelected
									? "bg-white/14 ring-2 ring-emerald-400/80 border-transparent shadow-md scale-[1.02]"
									: "bg-white/4 hover:bg-white/8 border border-white/6 hover:border-white/14"
							}`}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
									<span className="font-mono text-xs font-bold text-white">{item.symbol}</span>
								</div>
								<span className={`text-[10.5px] font-mono font-bold ${pos ? "text-emerald-400" : "text-rose-400"}`}>
									{pos ? "+" : ""}
									{item.change}%
								</span>
							</div>
							<div className="mt-1 flex items-baseline justify-between">
								<span className="font-mono text-[12px] font-semibold text-text tabular-nums">{item.price}</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
