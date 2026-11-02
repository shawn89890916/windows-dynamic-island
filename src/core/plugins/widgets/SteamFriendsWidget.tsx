import { ChevronLeftIcon, ChevronRightIcon, CircleIcon, ExternalLinkIcon, Gamepad2Icon } from "lucide-react";
import { useState } from "react";

interface SteamFriend {
	id: string;
	name: string;
	game?: string;
	status: "in-game" | "online" | "away";
}

const DEMO_FRIENDS: SteamFriend[] = [
	{ id: "1", name: "CyberMonkey", game: "黑神话：悟空", status: "in-game" },
	{ id: "2", name: "GabeN", game: "Counter-Strike 2", status: "in-game" },
	{ id: "3", name: "ShadowHunter", game: "Dota 2", status: "in-game" },
	{ id: "4", name: "PixelArt", status: "online" },
];

export function SteamFriendsWidget({ settings: _settings }: { settings: Record<string, unknown> }) {
	const [friends] = useState<SteamFriend[]>(DEMO_FRIENDS);
	const [currentIndex, setCurrentIndex] = useState(0);

	const playingFriends = friends.filter((f) => f.status === "in-game");
	const activeFriend = playingFriends[currentIndex] ?? friends[0];

	return (
		<div className="flex h-full items-center justify-between px-2 select-none">
			{/* Leading: Icon & Online Summary */}
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex size-11 flex-none items-center justify-center rounded-2xl bg-purple-500/16 text-purple-400">
					<Gamepad2Icon size={20} />
				</div>
				<div className="flex min-w-0 flex-col">
					<div className="flex items-center gap-1.5">
						<span className="text-[13px] font-semibold text-text">Steam 动态</span>
						<span className="rounded-full bg-emerald-500/18 px-1.5 py-0.2 text-[10px] font-medium text-emerald-400">
							{playingFriends.length} 游戏中
						</span>
					</div>
					<span className="mt-0.5 text-[11px] text-text-faint">{friends.length} 位好友在线</span>
				</div>
			</div>

			{/* Center: Featured Playing Friend Card */}
			<div className="flex min-w-0 flex-1 items-center justify-center px-4">
				{activeFriend && (
					<div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/6 px-3.5 py-1.5">
						<div className="relative">
							<div className="flex size-7.5 items-center justify-center rounded-xl bg-purple-500/20 text-xs font-bold text-text">
								{activeFriend.name.slice(0, 1)}
							</div>
							<CircleIcon size={8} className="absolute -right-0.5 -bottom-0.5 fill-emerald-400 text-emerald-400" />
						</div>
						<div className="flex flex-col min-w-0">
							<span className="truncate text-xs font-semibold text-text">{activeFriend.name}</span>
							<span className="truncate text-[11px] text-emerald-400 font-medium">
								{activeFriend.game ? `正在玩 ${activeFriend.game}` : "在线"}
							</span>
						</div>

						{playingFriends.length > 1 && (
							<div className="flex items-center gap-0.5 ml-2 border-l border-white/8 pl-2">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setCurrentIndex((prev) => (prev > 0 ? prev - 1 : playingFriends.length - 1));
									}}
									className="rounded p-0.5 text-text-faint hover:text-text"
								>
									<ChevronLeftIcon size={13} />
								</button>
								<span className="font-mono text-[10px] text-text-faint tabular-nums">
									{currentIndex + 1}/{playingFriends.length}
								</span>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setCurrentIndex((prev) => (prev < playingFriends.length - 1 ? prev + 1 : 0));
									}}
									className="rounded p-0.5 text-text-faint hover:text-text"
								>
									<ChevronRightIcon size={13} />
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Trailing: Launch Steam Capsule */}
			<div className="flex flex-none items-center gap-2">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						window.open("steam://open/friends", "_blank");
					}}
					className="flex h-8.5 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-xs font-semibold text-text hover:bg-white/18 active:scale-95"
				>
					<span>打开 Steam</span>
					<ExternalLinkIcon size={12} className="opacity-60" />
				</button>
			</div>
		</div>
	);
}
