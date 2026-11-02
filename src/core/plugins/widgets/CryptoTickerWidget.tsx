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
		<div className="flex h-full items-center justify-between px-2 select-none">
			{/* Leading: Icon & Asset Switcher Pills */}
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex size-11 flex-none items-center justify-center rounded-2xl bg-emerald-500/16 text-emerald-400">
					<TrendingUpIcon size={20} />
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-1.5">
						<span className="text-[13px] font-semibold text-text">{activeItem.name}</span>
						<span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
					</div>
					<div className="flex items-center gap-1">
						{items.map((item) => {
							const isSelected = item.symbol === activeSymbol;
							return (
								<button
									key={item.symbol}
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setActiveSymbol(item.symbol);
									}}
									className={`rounded-full px-2 py-0.5 text-[10.5px] font-mono font-semibold transition-all ${
										isSelected
											? "bg-white/18 text-white shadow-xs"
											: "bg-white/6 text-text-faint hover:bg-white/10 hover:text-text"
									}`}
								>
									{item.symbol}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* Center: Hero Live Price + Apple Pill Badge */}
			<div className="flex flex-col items-center justify-center px-4">
				<div className="font-mono text-[26px]/[1.1] font-bold tracking-tight text-text tabular-nums">
					{activeItem.price}
				</div>
				<div className="mt-1 flex items-center gap-2">
					<span
						className={`flex items-center gap-0.5 rounded-full px-2 py-0.2 text-[11px] font-mono font-bold ${
							isPos ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
						}`}
					>
						{isPos ? <ArrowUpRightIcon size={12} /> : <ArrowDownRightIcon size={12} />}
						<span>
							{isPos ? "+" : ""}
							{activeItem.change}%
						</span>
					</span>
					<span className="text-[10px] text-text-faint">24h 波动</span>
				</div>
			</div>

			{/* Trailing: Range Detail & Refresh Action */}
			<div className="flex flex-none items-center gap-3">
				<div className="flex flex-col items-end text-[11px] text-text-faint font-mono">
					<div>
						高: <span className="text-text">{activeItem.high24h}</span>
					</div>
					<div>
						低: <span className="text-text">{activeItem.low24h}</span>
					</div>
				</div>
				<button
					type="button"
					onClick={handleRefresh}
					title="刷新行情"
					className="flex size-8.5 items-center justify-center rounded-full bg-white/8 text-text-faint transition-all hover:bg-white/15 hover:text-white active:scale-95"
				>
					<RefreshCwIcon size={13} className={refreshing ? "animate-spin text-emerald-400" : ""} />
				</button>
			</div>
		</div>
	);
}
