import { CircleIcon, ExternalLinkIcon, Gamepad2Icon, MessageSquareIcon } from "lucide-react";
import { useState } from "react";
import { useT } from "../../../core/i18n";

interface SteamFriend {
	id: string;
	name: string;
	game?: string;
	status: "in-game" | "online" | "away";
	playtime?: string;
}

const DEMO_FRIENDS: SteamFriend[] = [
	{ id: "1", name: "CyberMonkey", game: "Black Myth: Wukong", status: "in-game", playtime: "42h" },
	{ id: "2", name: "GabeN", game: "Counter-Strike 2", status: "in-game", playtime: "Competitive" },
];

export function SteamFriendsWidget({ settings: _settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const [friends] = useState<SteamFriend[]>(DEMO_FRIENDS);

	const playingFriends = friends.filter((f) => f.status === "in-game");

	return (
		<div className="flex h-full flex-col justify-between px-3 py-1.5 select-none">
			{/* Top Bar: Header Summary & Quick Action */}
			<div className="flex items-center justify-between border-b border-white/8 pb-2.5">
				<div className="flex items-center gap-3 min-w-0">
					<div className="flex size-9.5 flex-none items-center justify-center rounded-2xl bg-purple-500/18 text-purple-400">
						<Gamepad2Icon size={19} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-[13px] font-semibold text-text whitespace-nowrap">
								{t("marketplace.widgets.steam.title")}
							</span>
							<span className="rounded-full bg-emerald-500/18 px-2 py-0.5 text-[10.5px] font-medium text-emerald-400 whitespace-nowrap">
								{t("marketplace.widgets.steam.inGameCount", { n: playingFriends.length })}
							</span>
						</div>
						<p className="text-[11px] text-text-faint whitespace-nowrap">
							{t("marketplace.widgets.steam.friendsOnline", { n: 4 })}
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						window.open("steam://open/friends", "_blank");
					}}
					className="flex h-8.5 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-xs font-semibold text-text transition-all hover:bg-white/18 active:scale-95 whitespace-nowrap ml-3"
				>
					<span>{t("marketplace.widgets.steam.openSteam")}</span>
					<ExternalLinkIcon size={12} className="opacity-60" />
				</button>
			</div>

			{/* 2-Column Spacious Friend Cards (Prevents text cramping in any language) */}
			<div className="grid grid-cols-2 gap-3 pt-2.5">
				{friends.map((f) => (
					<div
						key={f.id}
						className="group flex flex-col justify-between rounded-2xl border border-white/6 bg-white/4 p-3 transition-all hover:border-white/15 hover:bg-white/7"
					>
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-2.5 min-w-0">
								<div className="relative shrink-0">
									<div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/20 text-xs font-bold text-text">
										{f.name.slice(0, 1)}
									</div>
									<CircleIcon size={8} className="absolute -right-0.5 -bottom-0.5 fill-emerald-400 text-emerald-400" />
								</div>
								<div className="min-w-0 flex flex-col">
									<span className="truncate text-xs font-semibold text-text">{f.name}</span>
									<span className="text-[10px] text-text-faint">{f.playtime}</span>
								</div>
							</div>

							<button
								type="button"
								title={t("marketplace.widgets.steam.chat")}
								onClick={(e) => {
									e.stopPropagation();
									window.open(`steam://friends/message/${f.id}`, "_blank");
								}}
								className="rounded-full p-1.5 text-text-faint opacity-60 transition-opacity hover:opacity-100 hover:text-text shrink-0"
							>
								<MessageSquareIcon size={13} />
							</button>
						</div>

						<div className="mt-2.5 flex items-center">
							<span className="truncate rounded-md bg-emerald-500/12 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
								{f.game ? `${t("marketplace.widgets.steam.playing")} ${f.game}` : t("marketplace.widgets.steam.online")}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
