import { ArrowDownRightIcon, ArrowUpRightIcon, RefreshCwIcon, TrendingUpIcon } from "lucide-react";
import { useState } from "react";

interface CryptoItem {
	symbol: string;
	name: string;
	price: string;
	change: number;
	high24h: string;
	low24h: string;
}

const DEFAULT_ITEMS: CryptoItem[] = [
	{
		symbol: "BTC",
		name: "Bitcoin",
		price: "$88,420.50",
		change: 3.42,
		high24h: "$89,200",
		low24h: "$85,310",
	},
	{
		symbol: "ETH",
		name: "Ethereum",
		price: "$3,315.80",
		change: 2.15,
		high24h: "$3,350",
		low24h: "$3,210",
	},
	{
		symbol: "SOL",
		name: "Solana",
		price: "$182.40",
		change: -1.28,
		high24h: "$188",
		low24h: "$179",
	},
	{
		symbol: "NVDA",
		name: "Nvidia",
		price: "$139.20",
		change: 4.35,
		high24h: "$141",
		low24h: "$134",
	},
];

export function CryptoTickerWidget({ settings: _settings }: { settings: Record<string, unknown> }) {
	const [items, setItems] = useState<CryptoItem[]>(DEFAULT_ITEMS);
	const [activeSymbol, setActiveSymbol] = useState("BTC");
	const [refreshing, setRefreshing] = useState(false);

	const activeItem = items.find((i) => i.symbol === activeSymbol) ?? items[0];

	const handleRefresh = () => {
		setRefreshing(true);
		setTimeout(() => {
			// Fluctuate prices slightly for real feel
			setItems((prev) =>
				prev.map((item) => {
					const delta = (Math.random() - 0.48) * 0.4;
					const newChange = Number((item.change + delta).toFixed(2));
					return { ...item, change: newChange };
				}),
			);
			setRefreshing(false);
		}, 400);
	};

	return (
		<div className="flex h-full flex-col justify-between p-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-white/8 pb-3">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
						<TrendingUpIcon size={16} />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-text">实时行情看板</h3>
						<p className="text-[11px] text-text-faint">监控主流加密资产与核心美股走势</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleRefresh}
						title="刷新行情"
						className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/6 text-text-faint hover:bg-white/12 hover:text-text ${
							refreshing ? "animate-spin text-white" : ""
						}`}
					>
						<RefreshCwIcon size={12} />
					</button>
				</div>
			</div>

			{/* Active Token Hero */}
			<div className="my-auto flex items-center justify-between rounded-xl border border-white/6 bg-white/2 px-4 py-3">
				<div>
					<div className="flex items-center gap-2">
						<span className="font-mono text-base font-bold text-text">{activeItem.symbol}</span>
						<span className="text-xs text-text-faint">{activeItem.name}</span>
					</div>
					<div className="mt-1 font-mono text-2xl font-semibold text-text">{activeItem.price}</div>
				</div>

				<div className="text-right">
					<div
						className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${
							activeItem.change >= 0 ? "text-emerald-400" : "text-rose-400"
						}`}
					>
						{activeItem.change >= 0 ? <ArrowUpRightIcon size={14} /> : <ArrowDownRightIcon size={14} />}
						<span>
							{activeItem.change >= 0 ? "+" : ""}
							{activeItem.change}%
						</span>
					</div>
					<div className="mt-1 text-[10px] text-text-faint">
						高: {activeItem.high24h} · 低: {activeItem.low24h}
					</div>
				</div>
			</div>

			{/* Asset Selector Row */}
			<div className="grid grid-cols-4 gap-2 border-t border-white/6 pt-2.5">
				{items.map((item) => {
					const isSelected = item.symbol === activeSymbol;
					const isPos = item.change >= 0;
					return (
						<button
							key={item.symbol}
							type="button"
							onClick={() => setActiveSymbol(item.symbol)}
							className={`flex flex-col items-center justify-center rounded-lg p-1.5 transition-all ${
								isSelected ? "bg-white/12 ring-1 ring-white/20" : "bg-white/3 hover:bg-white/6"
							}`}
						>
							<span className="text-[11px] font-semibold text-text">{item.symbol}</span>
							<span className={`text-[10px] font-medium ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
								{isPos ? "+" : ""}
								{item.change}%
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
