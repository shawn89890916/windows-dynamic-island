import {
	BookOpenTextIcon,
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
import type { Focus, Story, Track } from "./musicStory";
import { generateStory, storyCacheKey, storySourceKey } from "./musicStory";

const CACHE_PREFIX = "island_music_story_v1_";
const FOCUS_OPTIONS: { id: Focus; label: string; icon: typeof BookOpenTextIcon }[] = [
	{ id: "song", label: "歌曲", icon: BookOpenTextIcon },
	{ id: "album", label: "专辑", icon: Disc3Icon },
	{ id: "artist", label: "创作者", icon: UserRoundIcon },
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

function getCached(track: Track, focus: Focus): Story | null {
	try {
		const raw = localStorage.getItem(CACHE_PREFIX + storyCacheKey(track, focus, ""));
		if (!raw) return null;
		const value = JSON.parse(raw) as Story;
		return Date.now() - Date.parse(value.createdUtc) < 30 * 24 * 60 * 60 * 1000 ? value : null;
	} catch {
		return null;
	}
}

function saveCached(track: Track, focus: Focus, story: Story) {
	try {
		localStorage.setItem(CACHE_PREFIX + storyCacheKey(track, focus, ""), JSON.stringify(story));
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

function readableError(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	if (/failed to fetch|networkerror|load failed/i.test(message))
		return "无法连接检索接口。请检查网络、接口地址及 WebView 的访问权限。";
	return message;
}

export function MusicStoryWidget({ settings }: { settings: Record<string, unknown> }) {
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
	const [follow, setFollow] = useState(true);
	const [track, setTrack] = useState<Track | null>(liveTrack);
	const [focus, setFocus] = useState<Focus>("song");
	const [story, setStory] = useState<Story | null>(() => (liveTrack ? getCached(liveTrack, "song") : null));
	const [collapsed, setCollapsed] = useState(false);
	const [loading, setLoading] = useState(false);
	const [phase, setPhase] = useState("");
	const [error, setError] = useState("");
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
			setStory(getCached(liveTrack, focus));
			setError("");
		}
		if (follow && !liveTrack) {
			setTrack(null);
			setStory(null);
		}
	}, [follow, liveTrack, track, focus]);

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
				setError(
					"请先在设置中心 → 插件市场 → 已安装中填写 DeepSeek API Key。请求会向配置的接口发送曲目信息与检索内容，并可能产生费用。",
				);
				return;
			}
			setLoading(true);
			setError("");
			setPhase("正在检索可靠的采访、唱片资料与创作者自述…");
			try {
				const next = await generateStory(
					track,
					focus,
					prompt,
					baseUrl,
					model,
					apiKey,
					prompt ? (story?.body ?? "") : (story?.body ?? ""),
					(stage) => setPhase(stage),
				);
				const merged = prompt || story ? mergeStories(story, next) : next;
				setStory(merged);
				setQuestion("");
				if (!prompt) saveCached(track, focus, merged);
			} catch (caught) {
				setError(readableError(caught));
			} finally {
				setLoading(false);
				setPhase("");
			}
		},
		[apiKey, baseUrl, focus, model, story, track],
	);

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
		setStory(track ? getCached(track, value) : null);
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
						<div className="truncate text-[13px] font-semibold" title={track?.title || "等一首歌响起"}>
							{track?.title || "等一首歌响起"}
						</div>
						<div
							className="mt-0.5 truncate text-[11px] text-text-dim"
							title={[track?.artist, track?.album].filter(Boolean).join(" · ")}
						>
							{track
								? [track.artist, track.album].filter(Boolean).join(" · ") || music?.appName
								: "在 Apple Music 或浏览器播放一首歌"}
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
							<IconButton aria-label="上一首" onClick={() => changeTrack("previous")} disabled={!music?.canPrevious}>
								<SkipBackIcon size={14} />
							</IconButton>
						)}
						<IconButton
							aria-label={music?.playing ? "暂停" : "播放"}
							onClick={togglePlayback}
							disabled={!music?.available}
						>
							{music?.playing ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
						</IconButton>
						{!collapsed && (
							<IconButton aria-label="下一首" onClick={() => changeTrack("next")} disabled={!music?.canNext}>
								<SkipForwardIcon size={14} />
							</IconButton>
						)}
						<IconButton
							aria-label={collapsed ? "展开播放器" : "收起播放器"}
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
							{label}
						</button>
					))}
				</div>
				<Button variant="soft" className="h-7 gap-1.5 rounded-full px-3 text-[11px]" onClick={toggleFollow}>
					<LockKeyholeIcon size={12} />
					{follow ? "跟随" : "已锁定"}
				</Button>
			</div>

			<Card className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
				<div className="mb-2 flex shrink-0 items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<SparklesIcon size={14} className="shrink-0 text-text-dim" />
						<h2 className="truncate text-[13px] font-semibold">
							{story?.title || (focus === "song" ? "这首歌的故事" : focus === "album" ? "这张专辑" : "创作者的轨迹")}
						</h2>
					</div>
					{story && <span className="shrink-0 text-[10px] text-text-faint">资料整理 · 查看来源</span>}
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
									? "从创作、录音和表达的细节开始，顺着来源讲清这首作品背后的故事。"
									: "播放音乐后，这里会显示当前作品。"}
							</p>
						</div>
					)}
				</div>
				{story?.sources?.length ? (
					<details className="mt-2 shrink-0 border-t border-hairline pt-2 text-[11px]">
						<summary className="cursor-pointer list-none text-text-faint hover:text-text">
							来源 · {story.sources.length}
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
						placeholder="还想知道什么？"
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
					追问
				</Button>
				<Button
					type="button"
					variant="soft"
					className="h-9 rounded-full px-4"
					disabled={!track || loading || !apiKey}
					onClick={() => void run()}
				>
					{loading ? "整理中" : story ? "继续" : "展开故事"}
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
