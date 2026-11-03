import { CircleIcon, ExternalLinkIcon, Gamepad2Icon, MessageSquareIcon, RefreshCwIcon } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { openExternal } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { NeedsConfigCard } from "./NeedsConfigCard";

interface SteamFriend {
	id: string;
	name: string;
	game?: string;
	status: "in-game" | "online" | "away";
}

interface RawPlayer {
	steamid: string;
	personaname?: string;
	gameextrainfo?: string;
	personastate: number;
}

export function SteamFriendsWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const translate = useRef(t);
	translate.current = t;
	const isConfigured = Boolean(settings.configured && settings.steamApiKey && settings.steamId64);
	const apiKey = String(settings.steamApiKey || "").trim();
	const steamId = String(settings.steamId64 || "").trim();

	const [friends, setFriends] = useState<SteamFriend[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchSteamFriends = useCallback(async () => {
		if (!apiKey || !steamId) return;
		setLoading(true);
		setError(null);

		try {
			// Query Steam Web API: GetFriendList then GetPlayerSummaries
			const friendListRes = await fetch(
				`https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${apiKey}&steamid=${steamId}&relationship=friend`,
			);
			if (!friendListRes.ok) throw new Error(translate.current("marketplace.widgets.pluginExtras.steam.unavailable"));
			const friendJson = await friendListRes.json();
			const rawFriends = (friendJson.friendslist?.friends || []) as { steamid: string }[];
			if (!rawFriends.length) {
				setFriends([]);
				return;
			}

			const ids = rawFriends
				.slice(0, 16)
				.map((f) => f.steamid)
				.join(",");
			const summariesRes = await fetch(
				`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${ids}`,
			);
			const summariesJson = await summariesRes.json();
			const players = (summariesJson.response?.players || []) as RawPlayer[];

			const parsed: SteamFriend[] = players
				.map((p) => ({
					id: p.steamid,
					name: p.personaname || translate.current("marketplace.widgets.pluginExtras.steam.friendFallback"),
					game: p.gameextrainfo,
					status: (p.gameextrainfo ? "in-game" : p.personastate > 0 ? "online" : "away") as SteamFriend["status"],
				}))
				.sort((a, b) => (b.game ? 1 : 0) - (a.game ? 1 : 0));

			setFriends(parsed);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [apiKey, steamId]);

	useEffect(() => {
		if (isConfigured) {
			fetchSteamFriends();
		}
	}, [isConfigured, fetchSteamFriends]);

	if (!isConfigured) {
		return (
			<NeedsConfigCard
				pluginId="com.island.steam-friends"
				title={t("marketplace.widgets.pluginExtras.steam.needsTitle")}
				description={t("marketplace.widgets.pluginExtras.steam.needsDescription")}
				icon={<Gamepad2Icon size={18} />}
				accentColor="#AB47BC"
				externalUrl="https://steamcommunity.com/dev/apikey"
				externalLabel={t("marketplace.ui.configureGuide")}
				settingsDefs={[
					{
						key: "steamApiKey",
						label: t("marketplace.widgets.pluginExtras.steam.apiKeyLabel"),
						type: "password",
						default: "",
					},
					{
						key: "steamId64",
						label: t("marketplace.widgets.pluginExtras.steam.keyLabel"),
						type: "text",
						default: "",
					},
				]}
				currentSettings={settings}
			/>
		);
	}

	const playingFriends = friends.filter((f) => f.status === "in-game");

	return (
		<div className="flex h-full flex-col justify-center gap-2 px-1 select-none">
			{/* Top Bar: Header Summary & Quick Action */}
			<div className="flex items-center justify-between border-b border-white/8 pb-1.5">
				<div className="flex items-center gap-3 min-w-0">
					<div className="flex size-9 flex-none items-center justify-center rounded-2xl bg-purple-500/18 text-purple-400">
						<Gamepad2Icon size={18} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-[13px] font-semibold text-text whitespace-nowrap">
								{t("marketplace.widgets.pluginExtras.steam.title")}
							</span>
							<span className="rounded-full bg-emerald-500/18 px-2 py-0.2 text-[10px] font-medium text-emerald-400 whitespace-nowrap">
								{t("marketplace.widgets.pluginExtras.steam.playingCount", { n: playingFriends.length })}
							</span>
						</div>
						<p className="text-[11px] text-text-faint whitespace-nowrap">
							{t("marketplace.widgets.pluginExtras.steam.friendsOnline", { n: friends.length })}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 ml-3">
					<button
						type="button"
						onClick={fetchSteamFriends}
						disabled={loading}
						className="flex size-7.5 items-center justify-center rounded-full bg-white/6 text-text-faint hover:bg-white/12 hover:text-text transition-colors"
						title={t("marketplace.widgets.pluginExtras.steam.refresh")}
					>
						<RefreshCwIcon size={12} className={loading ? "animate-spin text-purple-400" : ""} />
					</button>

					<motion.button
						type="button"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.92 }}
						onClick={(e) => {
							e.stopPropagation();
							openExternal("steam://open/friends");
						}}
						className="flex h-7.5 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-text transition-colors hover:bg-white/18"
					>
						<span>{t("marketplace.widgets.pluginExtras.steam.openSteam")}</span>
						<ExternalLinkIcon size={11} className="opacity-60" />
					</motion.button>
				</div>
			</div>

			{/* Friends Cards or Real Empty State */}
			{friends.length === 0 ? (
				<div className="flex items-center justify-center py-4 text-xs text-text-faint">
					{loading
						? t("marketplace.widgets.pluginExtras.steam.loading")
						: error
							? error
							: t("marketplace.widgets.pluginExtras.steam.empty")}
				</div>
			) : (
				<div className="grid grid-cols-2 gap-2 max-h-[105px] overflow-y-auto pr-0.5">
					{friends.map((f) => (
						<div
							key={f.id}
							className="flex flex-col justify-between rounded-xl border border-white/6 bg-white/4 p-2 transition-colors hover:border-white/15"
						>
							<div className="flex items-center justify-between gap-1.5">
								<div className="flex items-center gap-2 min-w-0">
									<div className="relative shrink-0">
										<div className="flex size-6 items-center justify-center rounded-lg bg-purple-500/20 text-[10px] font-bold text-text">
											{f.name.slice(0, 1)}
										</div>
										<CircleIcon
											size={6}
											className={`absolute -right-0.5 -bottom-0.5 ${
												f.game ? "fill-emerald-400 text-emerald-400" : "fill-sky-400 text-sky-400"
											}`}
										/>
									</div>
									<span className="truncate text-[11.5px] font-semibold text-text">{f.name}</span>
								</div>

								<button
									type="button"
									title={t("marketplace.widgets.pluginExtras.steam.chat")}
									onClick={(e) => {
										e.stopPropagation();
										openExternal(`steam://friends/message/${f.id}`);
									}}
									className="rounded-full p-1 text-text-faint hover:text-text"
								>
									<MessageSquareIcon size={11} />
								</button>
							</div>

							<div className="mt-1 flex items-center">
								<span className="truncate rounded px-1.5 py-0.2 text-[10px] font-medium bg-emerald-500/12 text-emerald-400">
									{f.game
										? t("marketplace.widgets.pluginExtras.steam.playing", { game: f.game })
										: t("marketplace.widgets.pluginExtras.steam.online")}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
