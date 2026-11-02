import { CircleIcon, ExternalLinkIcon, Gamepad2Icon, MessageSquareIcon } from "lucide-react";
import { useState } from "react";

interface SteamFriend {
	id: string;
	name: string;
	game?: string;
	status: "in-game" | "online" | "away";
	playtime?: string;
}

const DEMO_FRIENDS: SteamFriend[] = [
	{ id: "1", name: "CyberMonkey", game: "黑神话：悟空", status: "in-game", playtime: "已游玩 42h" },
	{ id: "2", name: "GabeN", game: "Counter-Strike 2", status: "in-game", playtime: "竞技匹配中" },
	{ id: "3", name: "ShadowHunter", game: "Dota 2", status: "in-game", playtime: "天梯排位中" },
];

export function SteamFriendsWidget({ settings: _settings }: { settings: Record<string, unknown> }) {
	const [friends] = useState<SteamFriend[]>(DEMO_FRIENDS);

	const playingFriends = friends.filter((f) => f.status === "in-game");

	return (
		<div className="flex h-full flex-col justify-between px-2 py-1 select-none">
			{/* Top Bar: Header Summary & Quick Action */}
			<div className="flex items-center justify-between border-b border-white/8 pb-2.5">
				<div className="flex items-center gap-2.5">
					<div className="flex size-9.5 items-center justify-center rounded-2xl bg-purple-500/18 text-purple-400">
						<Gamepad2Icon size={19} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-[13px] font-semibold text-text">Steam 好友动态</span>
							<span className="rounded-full bg-emerald-500/18 px-2 py-0.2 text-[10.5px] font-medium text-emerald-400">
								{playingFriends.length} 正在游戏中
							</span>
						</div>
						<p className="text-[11px] text-text-faint">4 位好友在线 · 随时加入联机房间</p>
					</div>
				</div>

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						window.open("steam://open/friends", "_blank");
					}}
					className="flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-xs font-semibold text-text transition-all hover:bg-white/18 active:scale-95"
				>
					<span>打开 Steam</span>
					<ExternalLinkIcon size={12} className="opacity-60" />
				</button>
			</div>

			{/* Multi-Friend Parallel Cards (Desktop Enhanced) */}
			<div className="grid grid-cols-3 gap-2.5 pt-2">
				{friends.map((f) => (
					<div
						key={f.id}
						className="group flex flex-col justify-between rounded-2xl border border-white/6 bg-white/4 p-2.5 transition-all hover:border-white/15 hover:bg-white/7"
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="relative">
									<div className="flex size-7.5 items-center justify-center rounded-xl bg-purple-500/20 text-xs font-bold text-text">
										{f.name.slice(0, 1)}
									</div>
									<CircleIcon size={7} className="absolute -right-0.5 -bottom-0.5 fill-emerald-400 text-emerald-400" />
								</div>
								<span className="truncate text-xs font-semibold text-text max-w-[85px]">{f.name}</span>
							</div>
							<span className="text-[10px] text-text-faint opacity-70">{f.playtime}</span>
						</div>

						<div className="mt-2.5 flex items-center justify-between">
							<span className="truncate rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-[10.5px] font-medium text-emerald-400 max-w-[110px]">
								{f.game ?? "在线"}
							</span>
							<button
								type="button"
								title="发送消息"
								onClick={(e) => {
									e.stopPropagation();
									window.open(`steam://friends/message/${f.id}`, "_blank");
								}}
								className="rounded-full p-1 text-text-faint opacity-60 transition-opacity hover:opacity-100 hover:text-text"
							>
								<MessageSquareIcon size={12} />
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
