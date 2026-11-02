import { ArrowDownRightIcon, ArrowUpRightIcon, RefreshCwIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
		<div className="flex h-full flex-col justify-center gap-2 px-1 select-none">
			{/* Top Hero Row: Crisp Active Asset Spotlight with Spring Morph */}
			<div className="flex items-center justify-between border-b border-white/8 pb-1.5">
				<div className="flex items-center gap-3 min-w-0">
					{/* Brand Squircle with Glyph & Pop Transition */}
					<AnimatePresence mode="popLayout" initial={false}>
						<motion.div
							key={activeItem.symbol}
							initial={{ scale: 0.7, rotate: -20, opacity: 0 }}
							animate={{ scale: 1, rotate: 0, opacity: 1 }}
							exit={{ scale: 0.7, rotate: 20, opacity: 0 }}
							transition={{ type: "spring", stiffness: 480, damping: 25 }}
							className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow-md"
							style={{ backgroundColor: `${activeItem.color}28`, color: activeItem.color }}
						>
							{activeItem.glyph}
						</motion.div>
					</AnimatePresence>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<span className="text-[13px] font-bold text-white font-mono tracking-tight">{activeItem.pair}</span>
							<span className="size-1.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
							<span className="text-xs text-text-faint truncate">({activeItem.name})</span>
						</div>
						<div className="flex items-center gap-2 text-[10.5px] font-mono text-text-faint mt-0.5">
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
						<AnimatePresence mode="popLayout" initial={false}>
							<motion.div
								key={activeItem.price}
								initial={{ opacity: 0, y: 6 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -6 }}
								transition={{ type: "spring", stiffness: 450, damping: 26 }}
								className="font-mono text-[22px]/[1.1] font-bold tracking-tight text-white tabular-nums drop-shadow-sm"
							>
								{activeItem.price}
							</motion.div>
						</AnimatePresence>
						<div className="mt-0.5 flex items-center justify-end">
							<span
								className={`flex items-center gap-0.5 rounded-full px-2 py-0.2 text-[10.5px] font-mono font-bold whitespace-nowrap shadow-sm border ${
									isPos
										? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
										: "bg-rose-500/20 text-rose-400 border-rose-500/30"
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

					<motion.button
						type="button"
						whileHover={{ scale: 1.08 }}
						whileTap={{ scale: 0.88 }}
						transition={{ type: "spring", stiffness: 500, damping: 24 }}
						onClick={handleRefresh}
						title={t("marketplace.widgets.crypto.refresh")}
						className="flex size-7.5 shrink-0 items-center justify-center rounded-full bg-white/10 text-text-faint transition-colors hover:bg-white/18 hover:text-white border border-white/8"
					>
						<RefreshCwIcon size={12} className={refreshing ? "animate-spin text-emerald-400" : ""} />
					</motion.button>
				</div>
			</div>

			{/* Bottom Grid: Snug & Cohesive 4-Asset Cards with Morphing Layout Glow */}
			<div className="grid grid-cols-4 gap-2 pt-0.5">
				{items.map((item) => {
					const isSelected = item.symbol === activeSymbol;
					const pos = item.change >= 0;
					return (
						<motion.button
							key={item.symbol}
							type="button"
							whileHover={{ scale: 1.03 }}
							whileTap={{ scale: 0.96 }}
							transition={{ type: "spring", stiffness: 450, damping: 25 }}
							onClick={(e) => {
								e.stopPropagation();
								setActiveSymbol(item.symbol);
							}}
							className="relative flex flex-col justify-between rounded-xl p-2 text-left transition-colors bg-white/4 border border-white/6 hover:border-white/14"
						>
							{isSelected && (
								<motion.div
									layoutId="crypto-active-glow"
									className="absolute inset-0 rounded-xl bg-white/14 ring-2 ring-emerald-400/80 shadow-md"
									transition={{ type: "spring", stiffness: 420, damping: 28 }}
								/>
							)}
							<div className="relative z-10 flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
									<span className="font-mono text-xs font-bold text-white">{item.symbol}</span>
								</div>
								<span className={`text-[10px] font-mono font-bold ${pos ? "text-emerald-400" : "text-rose-400"}`}>
									{pos ? "+" : ""}
									{item.change}%
								</span>
							</div>
							<div className="relative z-10 mt-1 flex items-baseline justify-between">
								<span className="font-mono text-[11.5px] font-semibold text-text tabular-nums">{item.price}</span>
							</div>
						</motion.button>
					);
				})}
			</div>
		</div>
	);
}
