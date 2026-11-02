import { CircleIcon, ExternalLinkIcon, Gamepad2Icon, UsersIcon } from "lucide-react";
import { useState } from "react";

interface SteamFriend {
	id: string;
	name: string;
	game?: string;
	status: "in-game" | "online" | "away";
}

const DEMO_FRIENDS: SteamFriend[] = [
	{ id: "1", name: "GabeN", game: "Counter-Strike 2", status: "in-game" },
	{ id: "2", name: "CyberMonkey", game: "黑神话：悟空", status: "in-game" },
	{ id: "3", name: "ShadowHunter", game: "Dota 2", status: "in-game" },
	{ id: "4", name: "PixelArt", status: "online" },
];

export function SteamFriendsWidget({ settings: _settings }: { settings: Record<string, unknown> }) {
	const [friends] = useState<SteamFriend[]>(DEMO_FRIENDS);

	const inGameCount = friends.filter((f) => f.status === "in-game").length;

	return (
		<div className="flex h-full flex-col justify-between p-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-white/8 pb-3">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
						<Gamepad2Icon size={16} />
					</div>
					<div>
						<h3 className="text-sm font-semibold text-text">Steam 好友状态</h3>
						<p className="text-[11px] text-text-faint">{inGameCount} 位好友正在游戏中</p>
					</div>
				</div>

				<span className="flex items-center gap-1 rounded-full bg-white/6 px-2.5 py-0.5 text-[10px] text-text-faint">
					<UsersIcon size={11} />
					<span>4 位好友在线</span>
				</span>
			</div>

			{/* Center Friends List */}
			<div className="my-auto flex flex-col gap-1.5 overflow-y-auto">
				{friends.map((f) => (
					<div key={f.id} className="flex items-center justify-between rounded-lg bg-white/2 px-3 py-1.5 text-xs">
						<div className="flex items-center gap-2">
							<div className="relative">
								<div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-text">
									{f.name.slice(0, 1)}
								</div>
								<CircleIcon
									size={8}
									className={`absolute -right-0.5 -bottom-0.5 rounded-full ${
										f.status === "in-game" ? "fill-emerald-400 text-emerald-400" : "fill-sky-400 text-sky-400"
									}`}
								/>
							</div>
							<span className="font-medium text-text">{f.name}</span>
						</div>

						<div>
							{f.game ? (
								<span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
									{f.game}
								</span>
							) : (
								<span className="text-[11px] text-text-faint">在线</span>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between border-t border-white/6 pt-2 text-[10px] text-text-faint">
				<span>随时了解好友开黑动态</span>
				<a href="steam://open/main" className="flex items-center gap-1 text-purple-300 hover:underline">
					<span>启动 Steam</span>
					<ExternalLinkIcon size={10} />
				</a>
			</div>
		</div>
	);
}
