import {
	BookOpenTextIcon,
	CheckCircle2Icon,
	ChevronDownIcon,
	ChevronUpIcon,
	CircleHelpIcon,
	Disc3Icon,
	LockKeyholeIcon,
	PauseIcon,
	PlayIcon,
	SkipBackIcon,
	SkipForwardIcon,
	SparklesIcon,
	UserRoundIcon,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { openExternal, providerAction, useProvider } from "../../../core/bridge";
import { useLocale, useT } from "../../../core/i18n";
import type { Focus, Story, Track } from "./musicStory";
import { generateStory, legacyStoryCacheKey, storyCacheKey, storySourceKey } from "./musicStory";

const CACHE_PREFIX = "island_music_story_v1_";
const COMPLETION_PREFIX = "island_music_story_completed_";
const PLUGIN_ID = "com.island.music-story";
let activityTimer: ReturnType<typeof setTimeout> | undefined;
let activitySequence = 0;

function publishActivity(
	value: { active: boolean; priority: number; left: string; right: string; activityKey?: string } | null,
) {
	const sdk = (
		globalThis as typeof globalThis & {
			__ISLAND_PLUGIN_SDK__?: {
				setPluginActivity: (id: string, activity: typeof value) => void;
			};
		}
	).__ISLAND_PLUGIN_SDK__;
	sdk?.setPluginActivity(PLUGIN_ID, value);
}

function showCompletionActivity(label: string, status: string) {
	if (activityTimer) clearTimeout(activityTimer);
	publishActivity({
		active: true,
		priority: 75,
		left: label,
		right: status,
		activityKey: `${Date.now()}:${++activitySequence}`,
	});
	activityTimer = setTimeout(() => publishActivity(null), 3600);
}

function showErrorActivity(label: string, status: string) {
	if (activityTimer) clearTimeout(activityTimer);
	publishActivity({ active: true, priority: 75, left: label, right: status });
	activityTimer = setTimeout(() => publishActivity(null), 3600);
}
const FOCUS_OPTIONS: { id: Focus; label: Focus; icon: typeof BookOpenTextIcon }[] = [
	{ id: "song", label: "song", icon: BookOpenTextIcon },
	{ id: "album", label: "album", icon: Disc3Icon },
	{ id: "artist", label: "artist", icon: UserRoundIcon },
];

interface MusicState {
	available: boolean;
	playing: boolean;
	title: string;
	artist: string;
	album: string;
	appId: string;
	appName: string;
	positionMs: number;
	positionAt: number;
	durationMs: number;
	thumbnail: string | null;
	canNext: boolean;
	canPrevious: boolean;
}

function trackFromMusic(music?: Pick<MusicState, "available" | "title" | "artist" | "album">): Track | null {
	if (!music?.available || !music.title.trim()) return null;
	return {
		title: music.title.trim(),
		artist: music.artist.trim(),
		album: music.album.trim(),
	};
}

function getCached(track: Track, focus: Focus, locale: string): Story | null {
	try {
		const key = CACHE_PREFIX + storyCacheKey(track, focus, "", locale);
		const raw =
			localStorage.getItem(key) ??
			(locale.toLowerCase().startsWith("zh")
				? localStorage.getItem(CACHE_PREFIX + legacyStoryCacheKey(track, focus))
				: null);
		if (!raw) return null;
		const value = JSON.parse(raw) as Story;
		if (Date.now() - Date.parse(value.createdUtc) >= 30 * 24 * 60 * 60 * 1000) return null;
		localStorage.setItem(key, raw);
		return value;
	} catch {
		return null;
	}
}

function recentCompletion(track: Track | null, locale: string): { at: number; focus: Focus } | null {
	if (!track) return null;
	try {
		const matches = (Object.keys({ song: true, album: true, artist: true }) as Focus[])
			.map((focus) => ({
				focus,
				at: Number(localStorage.getItem(COMPLETION_PREFIX + storyCacheKey(track, focus, "", locale))),
			}))
			.filter(({ at }) => at > 0 && Date.now() - at < 5000)
			.sort((a, b) => b.at - a.at);
		return matches[0] ? { at: matches[0].at, focus: matches[0].focus } : null;
	} catch {
		return null;
	}
}

function saveCached(track: Track, focus: Focus, story: Story, locale: string) {
	try {
		localStorage.setItem(CACHE_PREFIX + storyCacheKey(track, focus, "", locale), JSON.stringify(story));
	} catch {
		// Storage can be unavailable in private WebView contexts.
	}
}

function formatTime(ms: number) {
	const total = Math.floor(Math.max(0, ms) / 1000);
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function renderEmphasis(text: string) {
	const chunks: ReactNode[] = [];
	let offset = 0;
	for (const match of text.matchAll(/\*\*([^*]+)\*\*/g)) {
		const start = match.index ?? 0;
		if (start > offset) chunks.push(text.slice(offset, start));
		chunks.push(
			<strong key={`emphasis-${start}`} className="font-semibold text-text">
				{match[1]}
			</strong>,
		);
		offset = start + match[0].length;
	}
	if (offset < text.length) chunks.push(text.slice(offset));
	return chunks;
}

function readableError(error: unknown, t: ReturnType<typeof useT>) {
	const message = error instanceof Error ? error.message : String(error);
	if (/failed to fetch|networkerror|load failed/i.test(message))
		return t("marketplace.widgets.pluginExtras.musicStory.networkError");
	return message;
}

export function MusicStoryWidget({ settings }: { settings: Record<string, unknown> }) {
	const t = useT();
	const locale = useLocale();
	const music = useProvider<MusicState>("music");
	const available = music?.available;
	const title = music?.title;
	const artist = music?.artist;
	const album = music?.album;
	const liveTrack = useMemo(
		() =>
			trackFromMusic({ available: available ?? false, title: title ?? "", artist: artist ?? "", album: album ?? "" }),
		[available, title, artist, album],
	);
	const lastCompletion = recentCompletion(liveTrack, locale);
	const [follow, setFollow] = useState(true);
	const [track, setTrack] = useState<Track | null>(liveTrack);
	const [focus, setFocus] = useState<Focus>(lastCompletion?.focus ?? "song");
	const [story, setStory] = useState<Story | null>(() =>
		liveTrack ? getCached(liveTrack, lastCompletion?.focus ?? "song", locale) : null,
	);
	const [collapsed, setCollapsed] = useState(false);
	const [loading, setLoading] = useState(false);
	const [phase, setPhase] = useState("");
	const [error, setError] = useState("");
	const [completedAt, setCompletedAt] = useState(() => lastCompletion?.at ?? 0);
	const [question, setQuestion] = useState("");
	const [now, setNow] = useState(Date.now());
	const autoAttempt = useRef("");
	const questionRef = useRef<HTMLInputElement>(null);

	const baseUrl = String(settings.baseUrl ?? "https://api.deepseek.com");
	const model = String(settings.model ?? "deepseek-flash");
	const apiKey = String(settings.apiKey ?? "").trim();
	const autoGenerate = settings.autoGenerate === true;

	useEffect(() => {
		if (
			follow &&
			liveTrack &&
			(!track ||
				liveTrack.title !== track.title ||
				liveTrack.artist !== track.artist ||
				liveTrack.album !== track.album)
		) {
			setTrack(liveTrack);
			setStory(getCached(liveTrack, focus, locale));
			setCompletedAt(recentCompletion(liveTrack, locale)?.at ?? 0);
			setError("");
		}
		if (follow && !liveTrack) {
			setTrack(null);
			setStory(null);
		}
	}, [follow, liveTrack, track, focus, locale]);

	useEffect(() => {
		if (!music?.playing) return;
		const timer = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(timer);
	}, [music?.playing]);

	const position = music ? music.positionMs + (music.playing ? Math.max(0, now - music.positionAt) : 0) : 0;
	const progress = music?.durationMs ? Math.min(position / music.durationMs, 1) : 0;
	const run = useCallback(
		async (prompt = "") => {
			if (!track) return;
			if (!apiKey) {
				setError(t("marketplace.widgets.pluginExtras.musicStory.apiKeyRequired"));
				return;
			}
			setLoading(true);
			setError("");
			setPhase(t("marketplace.widgets.pluginExtras.musicStory.searching"));
			setCompletedAt(0);
			try {
				for (const completionFocus of ["song", "album", "artist"] as const)
					localStorage.removeItem(COMPLETION_PREFIX + storyCacheKey(track, completionFocus, "", locale));
			} catch {
				// Storage can be unavailable in private WebView contexts.
			}
			if (activityTimer) clearTimeout(activityTimer);
			publishActivity({
				active: true,
				priority: 75,
				left: t("marketplace.widgets.pluginExtras.musicStoryActivity.loadingLabel"),
				right: t("marketplace.widgets.pluginExtras.musicStoryActivity.loadingShort"),
			});
			try {
				const next = await generateStory(
					track,
					focus,
					prompt,
					baseUrl,
					model,
					apiKey,
					story?.body ?? "",
					(stage) => {
						setPhase(stage);
						const status =
							stage === t("marketplace.widgets.pluginExtras.musicStoryActivity.searchingMore") ||
							stage === t("marketplace.widgets.pluginExtras.musicStoryActivity.searching")
								? t("marketplace.widgets.pluginExtras.musicStoryActivity.loadingShort")
								: stage === t("marketplace.widgets.pluginExtras.musicStoryActivity.checking")
									? t("marketplace.widgets.pluginExtras.musicStoryActivity.checkingShort")
									: t("marketplace.widgets.pluginExtras.musicStoryActivity.writingShort");
						publishActivity({
							active: true,
							priority: 75,
							left: t("marketplace.widgets.pluginExtras.musicStoryActivity.loadingLabel"),
							right: status,
						});
					},
					locale,
				);
				const merged = prompt || story ? mergeStories(story, next) : next;
				setStory(merged);
				setQuestion("");
				saveCached(track, focus, merged, locale);
				const finishedAt = Date.now();
				setCompletedAt(finishedAt);
				try {
					localStorage.setItem(COMPLETION_PREFIX + storyCacheKey(track, focus, "", locale), String(finishedAt));
				} catch {
					// Storage can be unavailable in private WebView contexts.
				}
				showCompletionActivity(
					t("marketplace.widgets.pluginExtras.musicStoryActivity.loadingLabel"),
					t("marketplace.widgets.pluginExtras.musicStoryActivity.doneShort"),
				);
			} catch (caught) {
				setError(readableError(caught, t));
				showErrorActivity(
					t("marketplace.widgets.pluginExtras.musicStoryActivity.loadingLabel"),
					t("marketplace.widgets.pluginExtras.musicStoryActivity.errorShort"),
				);
			} finally {
				setLoading(false);
				setPhase("");
			}
		},
		[apiKey, baseUrl, focus, locale, model, story, t, track],
	);

	useEffect(() => {
		if (!completedAt) return;
		const timer = window.setTimeout(
			() => {
				setCompletedAt(0);
				if (!track) return;
				try {
					localStorage.removeItem(COMPLETION_PREFIX + storyCacheKey(track, focus, "", locale));
				} catch {
					// Storage can be unavailable in private WebView contexts.
				}
			},
			Math.max(0, 3600 - (Date.now() - completedAt)),
		);
		return () => window.clearTimeout(timer);
	}, [completedAt, focus, locale, track]);

	useEffect(() => {
		if (!autoGenerate || !follow || !track || !music?.playing || !apiKey || story || loading) return;
		const identity = `${track.title}\n${track.artist}\n${focus}`;
		if (autoAttempt.current === identity) return;
		const timer = window.setTimeout(() => {
			autoAttempt.current = identity;
			void run();
		}, 8000);
		return () => window.clearTimeout(timer);
	}, [apiKey, autoGenerate, focus, follow, loading, music?.playing, run, story, track]);

	const submitQuestion = (event: React.FormEvent) => {
		event.preventDefault();
		const value = question.trim();
		if (value) void run(value);
	};

	const chooseFocus = (value: Focus) => {
		setFocus(value);
		setStory(track ? getCached(track, value, locale) : null);
		setError("");
	};

	const toggleFollow = () => {
		if (follow && liveTrack) setTrack(liveTrack);
		setFollow((value) => !value);
	};

	const togglePlayback = () => void providerAction("music", "toggle");
	const changeTrack = (action: "previous" | "next") => void providerAction("music", action);

	return (
		<div className="flex h-full min-h-0 flex-col gap-2.5 px-1 text-text" data-no-drag>
			<Card className="shrink-0 overflow-hidden px-3.5 py-2.5">
				<div className="flex items-center gap-3">
					{!collapsed && (
						<div className="size-12 shrink-0 overflow-hidden rounded-[14px] bg-white/7 shadow-[inset_0_0_0_1px_var(--hairline)]">
							{music?.thumbnail ? (
								<img src={music.thumbnail} alt="" className="size-full object-cover" />
							) : (
								<Disc3Icon className="m-auto mt-3 text-text-faint" size={24} />
							)}
						</div>
					)}
					<div className="min-w-0 flex-1">
						<div
							className="truncate text-[13px] font-semibold"
							title={track?.title || t("marketplace.widgets.pluginExtras.musicStory.waitingForSong")}
						>
							{track?.title || t("marketplace.widgets.pluginExtras.musicStory.waitingForSong")}
						</div>
						<div
							className="mt-0.5 truncate text-[11px] text-text-dim"
							title={[track?.artist, track?.album].filter(Boolean).join(" · ")}
						>
							{track
								? [track.artist, track.album].filter(Boolean).join(" · ") || music?.appName
								: t("marketplace.widgets.pluginExtras.musicStory.playMusicHint")}
						</div>
						{!collapsed && music?.durationMs ? (
							<div className="mt-2 flex items-center gap-2">
								<div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
									<div className="h-full rounded-full bg-text/75" style={{ width: `${progress * 100}%` }} />
								</div>
								<span className="font-mono text-[10px] tabular-nums text-text-faint">
									{formatTime(position)} / {formatTime(music.durationMs)}
								</span>
							</div>
						) : null}
					</div>
					<div className="flex shrink-0 items-center gap-0.5">
						{!collapsed && (
							<IconButton
								aria-label={t("marketplace.widgets.pluginExtras.musicStory.previous")}
								onClick={() => changeTrack("previous")}
								disabled={!music?.canPrevious}
							>
								<SkipBackIcon size={14} />
							</IconButton>
						)}
						<IconButton
							aria-label={
								music?.playing
									? t("marketplace.widgets.pluginExtras.musicStory.pause")
									: t("marketplace.widgets.pluginExtras.musicStory.play")
							}
							onClick={togglePlayback}
							disabled={!music?.available}
						>
							{music?.playing ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
						</IconButton>
						{!collapsed && (
							<IconButton
								aria-label={t("marketplace.widgets.pluginExtras.musicStory.next")}
								onClick={() => changeTrack("next")}
								disabled={!music?.canNext}
							>
								<SkipForwardIcon size={14} />
							</IconButton>
						)}
						<IconButton
							aria-label={
								collapsed
									? t("marketplace.widgets.pluginExtras.musicStory.expandPlayer")
									: t("marketplace.widgets.pluginExtras.musicStory.collapsePlayer")
							}
							onClick={() => setCollapsed((value) => !value)}
						>
							{collapsed ? <ChevronDownIcon size={14} /> : <ChevronUpIcon size={14} />}
						</IconButton>
					</div>
				</div>
			</Card>

			<div className="flex shrink-0 items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-1 rounded-full bg-white/4 p-0.5 shadow-[inset_0_0_0_1px_var(--hairline)]">
					{FOCUS_OPTIONS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => chooseFocus(id)}
							className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] transition-colors ${focus === id ? "bg-white/12 text-text" : "text-text-faint hover:text-text"}`}
						>
							<Icon size={13} />
							{t(`marketplace.widgets.pluginExtras.musicStory.${label}`)}
						</button>
					))}
				</div>
				<Button variant="soft" className="h-7 gap-1.5 rounded-full px-3 text-[11px]" onClick={toggleFollow}>
					<LockKeyholeIcon size={12} />
					{follow
						? t("marketplace.widgets.pluginExtras.musicStory.follow")
						: t("marketplace.widgets.pluginExtras.musicStory.locked")}
				</Button>
			</div>

			<Card className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
				<div className="mb-2 flex shrink-0 items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<SparklesIcon size={14} className="shrink-0 text-text-dim" />
						<h2 className="truncate text-[13px] font-semibold">
							{story?.title || t(`marketplace.widgets.pluginExtras.musicStory.${focus}Story`)}
						</h2>
					</div>
					{story && (
						<span className="shrink-0 text-[10px] text-text-faint">
							{t("marketplace.widgets.pluginExtras.musicStory.sourceNote")}
						</span>
					)}
				</div>
				{loading && (
					<div className="mb-2 flex shrink-0 items-center gap-2 text-[10.5px] text-text-faint">
						<span className="size-1.5 animate-pulse rounded-full bg-text-dim" />
						{phase}
					</div>
				)}
				<div
					className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					data-no-drag
				>
					{story ? (
						<article className="select-text whitespace-pre-wrap text-[12.5px]/[1.8] text-text-dim">
							{story.body.split(/\n\s*\n/).map((paragraph) => (
								<p key={paragraph} className="mb-3 last:mb-0">
									{renderEmphasis(paragraph)}
								</p>
							))}
						</article>
					) : loading ? (
						<div className="flex h-full min-h-28 items-center justify-center gap-2 text-[12px] text-text-dim">
							<span className="size-1.5 animate-pulse rounded-full bg-text-dim" />
							{phase}
						</div>
					) : (
						<div className="flex h-full min-h-28 flex-col items-center justify-center gap-2 text-center">
							<BookOpenTextIcon size={22} className="text-text-faint" />
							<p className="max-w-[340px] text-[12px]/[1.65] text-text-faint">
								{track
									? t("marketplace.widgets.pluginExtras.musicStory.emptyStory")
									: t("marketplace.widgets.pluginExtras.musicStory.emptyTrack")}
							</p>
						</div>
					)}
				</div>
				{story?.sources?.length ? (
					<details className="mt-2 shrink-0 border-t border-hairline pt-2 text-[11px]">
						<summary className="cursor-pointer list-none text-text-faint hover:text-text">
							{t("marketplace.widgets.pluginExtras.musicStory.sources", { n: story.sources.length })}
						</summary>
						<div className="mt-1.5 flex max-h-20 flex-col gap-1 overflow-y-auto">
							{story.sources.map((source) => (
								<button
									key={`${source.id}-${source.url}`}
									type="button"
									onClick={() => void openExternal(source.url)}
									className="truncate text-left text-text-dim hover:text-text"
									title={source.url}
								>
									[{source.id}] {source.title}
								</button>
							))}
						</div>
					</details>
				) : null}
			</Card>

			{completedAt > 0 && (
				<div
					role="status"
					aria-live="polite"
					className="flex shrink-0 items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/8 px-3 py-2 text-[11px] text-emerald-200"
				>
					<CheckCircle2Icon size={14} className="shrink-0" />
					{t("marketplace.widgets.pluginExtras.musicStoryActivity.readyNotice")}
				</div>
			)}

			{error && (
				<div role="alert" className="shrink-0 rounded-lg bg-[#ff5f57]/10 px-3 py-2 text-[11px]/[1.5] text-[#ff9b96]">
					{error}
				</div>
			)}

			<form onSubmit={submitQuestion} className="flex shrink-0 items-center gap-2" data-no-drag>
				<label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/4 px-3 shadow-[inset_0_0_0_1px_var(--hairline)] focus-within:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
					<CircleHelpIcon size={14} className="shrink-0 text-text-faint" />
					<input
						ref={questionRef}
						value={question}
						onChange={(event) => setQuestion(event.target.value)}
						placeholder={t("marketplace.widgets.pluginExtras.musicStory.questionPlaceholder")}
						className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-text outline-none placeholder:text-text-faint"
						disabled={!track || loading}
					/>
				</label>
				<Button
					type="submit"
					variant="primary"
					className="h-9 rounded-full px-4"
					disabled={!question.trim() || !track || loading}
				>
					{t("marketplace.widgets.pluginExtras.musicStory.ask")}
				</Button>
				<Button
					type="button"
					variant="soft"
					className="h-9 rounded-full px-4"
					disabled={!track || loading || !apiKey}
					onClick={() => void run()}
				>
					{loading
						? t("marketplace.widgets.pluginExtras.musicStory.working")
						: story
							? t("marketplace.widgets.pluginExtras.musicStory.continue")
							: t("marketplace.widgets.pluginExtras.musicStory.generate")}
				</Button>
			</form>
		</div>
	);
}

function mergeStories(previous: Story | null, next: Story): Story {
	if (!previous) return next;
	const maxId = Math.max(0, ...previous.sources.map((source) => source.id));
	const sourceMap = new Map<number, number>();
	const knownSources = new Map(previous.sources.map((source) => [storySourceKey(source.url), source.id]));
	const additions: Story["sources"] = [];
	let nextId = maxId;
	for (const source of next.sources) {
		const key = storySourceKey(source.url);
		let id = knownSources.get(key);
		if (!id) {
			id = ++nextId;
			knownSources.set(key, id);
			additions.push({ ...source, id });
		}
		sourceMap.set(source.id, id);
	}
	const body = next.body.replace(/\[(\d+)\]/g, (match, id: string) => {
		const mapped = sourceMap.get(Number(id));
		return mapped ? `[${mapped}]` : match;
	});
	return {
		...next,
		body: `${previous.body}\n\n${body}`,
		sources: [...previous.sources, ...additions],
	};
}
