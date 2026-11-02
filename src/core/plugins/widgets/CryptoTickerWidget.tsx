import { ArrowDownRightIcon, ArrowUpRightIcon, RefreshCwIcon, TrendingUpIcon } from "lucide-react";
import { useState } from "react";
import { useT } from "../../../core/i18n";

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
			{/* Top Hero Row: Active Asset Spotlight */}
			<div className="flex items-center justify-between border-b border-white/8 pb-2.5">
				<div className="flex items-center gap-3 min-w-0">
					<div className="flex size-9.5 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/18 text-emerald-400">
						<TrendingUpIcon size={19} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<span className="text-[13px] font-semibold text-text truncate">{activeItem.name}</span>
							<span className="size-1.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
						</div>
						<div className="flex items-center gap-2 text-[11px] font-mono text-text-faint">
							<span>
								{t("marketplace.widgets.crypto.high")}: <span className="text-text">{activeItem.high24h}</span>
							</span>
							<span>·</span>
							<span>
								{t("marketplace.widgets.crypto.low")}: <span className="text-text">{activeItem.low24h}</span>
							</span>
						</div>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-3">
					<div className="text-right">
						<div className="font-mono text-[22px]/[1.1] font-bold tracking-tight text-text tabular-nums">
							{activeItem.price}
						</div>
						<div className="mt-0.5 flex items-center justify-end">
							<span
								className={`flex items-center gap-0.5 rounded-full px-2 py-0.2 text-[10.5px] font-mono font-bold whitespace-nowrap ${
									isPos ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
								}`}
							>
								{isPos ? <ArrowUpRightIcon size={11} /> : <ArrowDownRightIcon size={11} />}
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
						className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-text-faint transition-all hover:bg-white/16 hover:text-white active:scale-95"
					>
						<RefreshCwIcon size={12} className={refreshing ? "animate-spin text-emerald-400" : ""} />
					</button>
				</div>
			</div>

			{/* Bottom Grid: 4 Parallel Asset Comparison Cards */}
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
									? "bg-white/12 ring-1 ring-white/20 shadow-xs"
									: "bg-white/4 hover:bg-white/8 border border-white/4"
							}`}
						>
							<div className="flex items-center justify-between">
								<span className="font-mono text-xs font-bold text-text">{item.symbol}</span>
								<span className={`text-[10.5px] font-mono font-semibold ${pos ? "text-emerald-400" : "text-rose-400"}`}>
									{pos ? "+" : ""}
									{item.change}%
								</span>
							</div>
							<span className="mt-1 font-mono text-[11px] text-text-faint tabular-nums truncate">{item.price}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
