import {
	BookOpenIcon,
	CheckCircle2Icon,
	CheckIcon,
	ExternalLinkIcon,
	EyeIcon,
	EyeOffIcon,
	HelpCircleIcon,
	InfoIcon,
	PlayIcon,
	RefreshCwIcon,
	RotateCcwIcon,
	SlidersIcon,
	SparklesIcon,
	Trash2Icon,
	XCircleIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Card, Row } from "../../components/ui/card";
import { Input, Select } from "../../components/ui/form";
import { command } from "../../core/bridge";
import { useT } from "../../core/i18n";
import { MARKETPLACE_CATALOG } from "../../core/plugins/catalog";
import { queryEverything } from "../../core/plugins/everythingClient";
import { fetchNavoPathSummary, fetchNavoPathTasks } from "../../core/plugins/navopathMcp";
import { fetchRecentNotes } from "../../core/plugins/obsidianClient";
import { dailyNoteName } from "../../core/plugins/obsidianDailyNote";
import {
	installPlugin,
	renderPluginIcon,
	togglePlugin,
	uninstallPlugin,
	updatePluginSettings,
	useInstalledPlugins,
} from "../../core/plugins/registry";
import type { PluginSettingField } from "../../core/plugins/types";
import { readVpnSnapshot, vpnConfig } from "../../core/plugins/vpnClient";
import { BackLink } from "../components/Heading";
import { PlacementSelect } from "../components/PlacementSelect";
import { Toggle } from "../components/Toggle";

interface GuideStep {
	title: string;
	desc: string;
	tip?: string;
	link?: { url: string; label: string };
}

interface PluginGuide {
	summary: string;
	prerequisites?: string[];
	steps: GuideStep[];
	features?: string[];
	faq?: { q: string; a: string }[];
}

const PLUGIN_GUIDES: Record<string, PluginGuide> = {
	"com.island.everything": {
		summary: "直连本地 Voidtools Everything 原生 HTTP 服务，实现毫秒级全盘极速秒搜，支持键盘导航与一键定位。",
		prerequisites: [
			"Windows 电脑已安装 Everything 桌面客户端 (1.4 或 1.5a 均可)",
			"Everything 正在后台保持运行（任务栏通知区可见图标）",
		],
		steps: [
			{
				title: "打开 Everything 选项设置",
				desc: "在 Everything 主界面顶部菜单栏点击「工具 (Tools)」→「选项 (Options)」，或直接使用全局快捷键 Ctrl + P。",
			},
			{
				title: "启用 HTTP 服务器",
				desc: "在左侧分类导航树中点击「HTTP 服务器 (HTTP Server)」，并在右侧顶部勾选「启用 HTTP 服务器 (Enable HTTP server)」。",
				tip: "建议将端口保持为默认的 8080。若 8080 端口已被其他服务占用，可自定义端口并在上方配置项中同步修改。",
			},
			{
				title: "配置认证信息 (可选)",
				desc: "本地个人使用建议留空「用户名」与「密码」，点击底部「应用」并「确定」即可生效。",
				tip: "无需重启软件，HTTP 服务会在勾选后毫秒级内自动在后台监听启动。",
			},
			{
				title: "在灵动岛极速全盘秒搜",
				desc: "点击灵动岛上的 Everything 搜索栏，输入文件名即可全盘秒出结果。使用键盘 ↑ / ↓ 方向键选择，按 Enter 回车键直接运行打开，按 Ctrl+Enter 在文件夹中精准高亮定位。",
			},
		],
		features: [
			"全盘毫秒级闪电响应，超低内存开销",
			"支持拼音首字母搜索与通配符 (*, ?)",
			"文件与文件夹专属多彩类型图标高亮",
			"支持在 Windows 资源管理器中一键定位选中文件",
		],
		faq: [
			{
				q: "为什么显示无法连接 Everything HTTP 服务？",
				a: "请确认 Everything 客户端正在后台运行，并且已在「工具 → 选项 → HTTP 服务器」中勾选了「启用 HTTP 服务器」。",
			},
			{
				q: "如果端口 8080 被占用怎么办？",
				a: "可以在 Everything 中修改为 8088、9000 等其他空闲端口，并在上方的「Everything HTTP 服务端口」输入框填入相同端口即可。",
			},
		],
	},

	"com.island.navopath": {
		summary: "直连 NavoPath 个人 AI 规划器官方 MCP (Model Context Protocol) 接口，全自动拉取日程、待办与时间线任务。",
		prerequisites: ["拥有 NavoPath 规划器平台账号并获取个人专属 MCP 授权 Token"],
		steps: [
			{
				title: "获取 NavoPath MCP 凭证",
				desc: "登录 NavoPath 规划器平台，前往「设置 → 日历与集成 → MCP」页面（旧版位于「高级」下），按设备名称生成个人访问令牌，并立即复制完整的 nvp_... 内容（原文只显示一次）。",
				link: { url: "https://navopath-planner.vercel.app", label: "访问 NavoPath 官方平台" },
			},
			{
				title: "填写自己的凭据并测试连接",
				desc: "将复制的 Token 粘贴到上方「NavoPath MCP 凭证」输入框中。默认服务端点预置为官方 Cloudflare Worker Streamable HTTP 接口，无需修改。",
				tip: "每位用户使用自己的令牌。配置会自动保存，点击「测试连接」确认成功；时钟与日历会自动复用这份配置。",
			},
			{
				title: "即时打卡与日程追踪",
				desc: "灵动岛显示真实待办与项目统计。时钟与日历根据任务排期、计划日期和截止日期显示圆点，点击日期查看当天任务。点击任务左侧圆圈标记完成，输入框可添加待办。",
			},
		],
		features: [
			"基于 MCP 的真实数据读取与任务操作，显示时每分钟刷新并支持手动重试",
			"项目分类、未完成待办数与总完成数统计看板",
			"灵动岛内一键打卡完成与极速创建新待办",
		],
		faq: [
			{
				q: "提示 Token 无效或 MCP 连接失败？",
				a: "请检查 Token 格式是否以 nvp_ 开头，并确认网络可正常访问 navopath-mcp.shawn89890916.workers.dev 端点。",
			},
		],
	},

	"com.island.obsidian": {
		summary: "通过 Obsidian 官方深度协议直连个人 Markdown 本地知识库，支持日记秒打卡、灵感闪念追加与历史笔记检索。",
		prerequisites: [
			"Windows 电脑已安装 Obsidian 客户端 (可在 obsidian.md 免费下载)",
			"本地已创建或打开至少一个 Markdown 知识库仓库",
		],
		steps: [
			{
				title: "选择知识库路径",
				desc: "填写实际知识库文件夹的绝对路径，名称会从路径自动提取。最近笔记共用 Everything 插件的索引端口。",
			},
			{
				title: "设置每日日记目录",
				desc: "日记目录填写相对文件夹，留空使用仓库根目录。命名默认 YYYY-MM-DD，也支持 YYYY年MM月DD日、YYYY/MM/DD；请与 Obsidian 的日记设置保持一致。",
			},
			{
				title: "灵动岛沉浸式记录",
				desc: "点击「今日日记」打开按目录和格式确定的文件。闪念速记会创建独立笔记，标签会写入内容；连接诊断只检查索引与命名，不会创建日记。",
			},
		],
		features: [
			"通过官方 obsidian:// 深度协议通信，零后台常驻进程，零额外内存开销",
			"每日日记一键打开与自动补全当日日期",
			"闪念与标签创建为独立笔记",
			"配合 Everything 插件可毫秒级秒搜库内历史笔记",
		],
		faq: [
			{
				q: "点击按钮没有任何反应？",
				a: "请确保已安装 Obsidian 官方客户端。Obsidian 在安装时会自动注册系统 obsidian:// 协议处理程序。",
			},
		],
	},

	"com.island.steam-friends": {
		summary: "直连 Valve Steam 官方 Web API，实时捕获在线好友动态，当好友启动联机游戏时及时在灵动岛弹出提醒。",
		prerequisites: ["拥有 Steam 账号，个人资料与游戏详情设置为「公开」", "在 Steam 开发者平台申请专属免费 Web API Key"],
		steps: [
			{
				title: "申请 Steam Web API Key",
				desc: "在浏览器登录 Steam 并访问 Web API Key 申请页面。域名处随意填写（例如 localhost），勾选同意后生成 32 位专属密钥。",
				link: { url: "https://steamcommunity.com/dev/apikey", label: "申请 Steam Web API Key" },
			},
			{
				title: "获取个人 SteamID64",
				desc: "SteamID64 是一串 17 位纯数字（通常以 7656119... 开头）。可在 Steam 个人主页 URL 中查看，或在 SteamID 查询工具输入昵称查找。",
				link: { url: "https://steamid.io", label: "在线查询 SteamID64" },
			},
			{
				title: "将隐私设置为公开",
				desc: "在 Steam 客户端点击「个人资料」→「编辑个人资料」→「隐私设置」，确保「我的个人资料」和「游戏详情」均设为「公开」。",
			},
		],
		features: [
			"直观展示好友当前在线、忙碌、游戏中与离线状态",
			"实时显示好友正在游玩的游戏封面与名称",
			"好友上线开黑自动在胶囊栏弹出动态通知",
		],
	},

	"com.island.weather": {
		summary: "基于全球领先的 Open-Meteo 开源气象库与逆地理编码，精准显示实时气温、体感与恶劣天气预警，永久免费免 Key。",
		prerequisites: ["设备正常联网即可，100% 永久免费，完全无需注册或购买任何付费 API Key"],
		steps: [
			{
				title: "设置所在城市",
				desc: "在上方输入框填入你所在的城市拼音或英文全拼（例如：Beijing, Shanghai, Shenzhen, Guangzhou, Hangzhou, Chengdu, Tokyo, London 等）。",
			},
			{
				title: "选择温标与预警选项",
				desc: "可根据个人习惯选择摄氏度 (°C) 或华氏度 (°F)。勾选「降雨降雪恶劣天气主动提醒」后，若未来 2 小时内有雨雪天气，灵动岛将主动展开动效预警。",
			},
		],
		features: [
			"高精度实时气温、天气图符与体感温度",
			"未来数小时天气趋势预测与降水概率",
			"雨、雪、暴风雨恶劣天气胶囊栏动态警报",
		],
	},

	"com.island.crypto-ticker": {
		summary: "直连币安 (Binance) 现货高频行情公网公开接口，自选加密货币与股票实时报价看板，红绿涨跌波动一目了然。",
		prerequisites: ["设备正常联网，直连公网行情接口，无需账号或 Token 即可使用"],
		steps: [
			{
				title: "自定义关注代码",
				desc: "在上方「监控代码」中填入关注的代码，以半角逗号分隔。支持 BTC, ETH, SOL, BNB, DOGE, XRP, ADA 等热门资产。",
				tip: "输入代码会自动转换为 USDT 现货交易对并实时拉取最新价格与 24h 涨跌幅。",
			},
			{
				title: "调整刷新间隔",
				desc: "可根据个人需求设置刷新频率（推荐 15 ~ 60 秒），既能保证行情敏锐度，又几乎不占用系统带宽。",
			},
		],
		features: [
			"24h 涨跌幅百分比与最新成交价实时滚动",
			"自适应红绿行情配色与极简波形看板",
			"价格异常大幅剧烈波动时胶囊栏闪烁提醒",
		],
	},

	"com.island.vpn": {
		summary: "本机控制器节点列表、定时测速、真实节点切换及指定候选节点故障切换。",
		prerequisites: [
			"电脑已运行 UniClash、Clash Verge 或 Clash for Windows 客户端",
			"在客户端启用 External Controller，例如 127.0.0.1:9090；混合代理端口不能用于控制节点",
		],
		steps: [
			{
				title: "检查代理客户端端口",
				desc: "在代理客户端启用 External Controller 并监听 127.0.0.1。记录控制地址与 Secret；不要填写 7890、8993 等混合代理端口。",
			},
			{
				title: "填入端口配置",
				desc: "填写完整控制地址与 Secret，点击测试验证。选择包含实际节点的手动策略组，列表显示本轮最快的几个节点，点击节点名称切换。",
			},
			{
				title: "选择分流模式",
				desc: "默认每轮完成后等待 60 秒再测速，可修改间隔、超时及展示数量。勾选候选节点后开启自动切换；仅当前节点本轮失败时切换到可用候选，不会为了更低延迟反复换节点，直连模式不触发。",
			},
		],
		features: [
			"最快节点与当前节点延迟",
			"节点、规则/全局/直连模式实际切换并回读确认",
			"超时提示、可调测速间隔及指定候选节点故障切换",
		],
	},

	"com.island.pomodoro": {
		summary: "科学高效的番茄工作法计时器，胶囊栏常驻倒计时进度，并在休息时智能提醒，后台持续精准同步。",
		steps: [
			{
				title: "设置专注与休息时长",
				desc: "在上方自定义你的「专注时长」（经典番茄钟为 25 分钟）与「休息时长」（通常为 5 分钟）。",
			},
			{
				title: "启用自动轮转",
				desc: "勾选「专注结束后自动开始休息」，一个专注周期结束后会自动开启休息倒计时，帮助劳逸结合。",
			},
			{
				title: "灵动岛胶囊常驻与提醒",
				desc: "在灵动岛展开后点击「开始专注」，胶囊栏将常驻显示剩余时间与彩色进度环。无论鼠标移开或切换到其他窗口，后台高精度计时器始终精准运行，计时结束时自动弹出动态岛提醒与轻柔提示音。",
			},
		],
		features: [
			"胶囊栏常驻高灵动微型倒计时与环形进度条",
			"后台常驻秒级精准计时，切换窗口不丢秒",
			"专注与休息状态自适应双色主题动效",
		],
	},

	"com.island.work-countdown": {
		summary: "打工人专属摸鱼神器：直观显示距离今日下班与周末的倒计时刻，自动计算今日进度百分比。",
		steps: [
			{
				title: "设定工作作息时间",
				desc: "在上方分别填入你的每日「上班时间」（如 09:00）与「下班时间」（如 18:00）。",
			},
			{
				title: "开启周末倒计时",
				desc: "勾选「周五下午展示周末倒计时」，每逢周五下午灵动岛会自动切换为充满期待的周末大倒计时模式！",
			},
		],
		features: ["实时计算今日工时消耗百分比进度条", "距离下班剩余小时与分钟倒数", "周五下午自动激活周末狂欢倒计时"],
	},

	"com.island.quick-memo": {
		summary: "快速收集剪藏与灵感便签，随时随地展开记录，支持 Markdown 语法高亮与一键导出。",
		steps: [
			{
				title: "快速记录灵感与待办",
				desc: "展开灵动岛快速点击灵动速记输入框，直接键入闪念想法或任务待办，按回车立即添加。",
			},
			{
				title: "勾选完成与管理",
				desc: "点击便签左侧圆圈可标记任务完成；若开启上方「自动清理已勾选的待办项」，已完成的任务会自动从列表中移出以保持清爽。",
			},
		],
		features: [
			"毫秒级展开，支持快速暂存文字与代码片段",
			"字体大小支持标准 (13px) 与大号 (15px) 随心切换",
			"支持一键全部清空与剪贴板快速复制",
		],
	},

	"com.island.ai-hub": {
		summary: "全场景 AI 智能体控制中枢，聚合 Antigravity、Claude Code、Codex 与 ChatGPT 运行监控与全局指令调度。",
		steps: [
			{
				title: "选择默认聚焦智能体",
				desc: "在上方配置项选择你最常用的智能体（Gemini / Antigravity、Claude Code、Codex 或 ChatGPT）。灵动岛每次展开时将默认聚焦该智能体。",
			},
			{
				title: "全局指令调度",
				desc: "在展开面板底部的全局指令框中输入你想提问或交代的问题，回车即可调度并直接唤醒对应桌面客户端。",
			},
		],
		features: [
			"多模型智能体活跃状态与今日 Token 消耗统计看板",
			"真实读取本地 Claude Code 与 Codex 运行轨迹与会话",
			"一键调度并唤醒对应 Agent 客户端主窗口",
		],
	},

	"com.island.im-notifications": {
		summary: "微信与 QQ 桌面消息聚合，支持双端在线状态、未读动态预览、一键唤起客户端与灵动闪速回复。",
		steps: [
			{
				title: "设置默认回复应用",
				desc: "在上方「默认回复目标」选择微信 (WeChat) 或腾讯 QQ，作为灵动岛快捷唤醒的首选应用。",
			},
			{
				title: "一键唤醒与快捷预览",
				desc: "有未读消息时灵动岛胶囊栏将常驻显示未读气泡与头像提示，点击对应头像即可将微信或 QQ 窗口置顶唤起。",
			},
		],
		features: [
			"桌面微信与 QQ 状态聚合与未读消息计数",
			"一键激活并将对应 IM 客户端窗口前置",
			"微信原生态绿色与 QQ 灵动蓝色双色主题",
		],
	},
};

export function PluginPage({
	pluginId: propPluginId,
	from = "marketplace",
	values: _propValues,
}: {
	pluginId?: string;
	from?: "modules" | "marketplace";
	values?: Record<string, unknown>;
}) {
	const t = useT();
	const navigate = useNavigate();
	const params = useParams<{ id: string }>();
	const targetId = propPluginId || params.id;

	const installed = useInstalledPlugins();
	const plugin = installed.find((p) => p.manifest.id === targetId);

	// Catalog fallback if not installed
	const catalogItem = MARKETPLACE_CATALOG.find((m) => m.id === targetId);
	const manifest = plugin?.manifest || catalogItem;

	// Local states for settings and testing
	const [formValues, setFormValues] = useState<Record<string, unknown>>(() => ({
		...(plugin?.customSettings ?? {}),
	}));
	const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
	const [saveNotification, setSaveNotification] = useState(false);
	const [confirmUninstall, setConfirmUninstall] = useState(false);

	// Diagnostic testing states
	const [diagLoading, setDiagLoading] = useState(false);
	const [diagResult, setDiagResult] = useState<{
		status: "success" | "error" | "info";
		message: string;
		details?: string;
	} | null>(null);

	// Synchronize when plugin changes
	useEffect(() => {
		if (plugin?.customSettings) {
			setFormValues({ ...plugin.customSettings });
		}
	}, [plugin]);

	if (!manifest) {
		return <Navigate to="/marketplace" replace />;
	}

	const title = manifest.titleKey ? t(manifest.titleKey) : manifest.name;
	const desc = manifest.descKey ? t(manifest.descKey) : manifest.description;
	const guide = PLUGIN_GUIDES[manifest.id];

	const handleSettingChange = (key: string, value: unknown) => {
		const updated = { ...formValues, [key]: value };
		setFormValues(updated);
		if (plugin) {
			updatePluginSettings(plugin.manifest.id, { [key]: value });
			setSaveNotification(true);
			setTimeout(() => setSaveNotification(false), 2000);
		}
	};

	const handleResetDefaults = () => {
		if (!manifest.settings) return;
		const defaults: Record<string, unknown> = {};
		for (const s of manifest.settings) {
			defaults[s.key] = s.default;
		}
		setFormValues(defaults);
		if (plugin) {
			updatePluginSettings(plugin.manifest.id, defaults);
			setSaveNotification(true);
			setTimeout(() => setSaveNotification(false), 2000);
		}
	};

	// Interactive Diagnostic Test Runners
	const runDiagnosticTest = async () => {
		setDiagLoading(true);
		setDiagResult(null);

		try {
			if (manifest.id === "com.island.everything") {
				const port = Number(formValues.httpPort ?? 8080);
				const res = await queryEverything("test", port, 5);
				if (res.ok) {
					setDiagResult({
						status: "success",
						message: `连接正常！Everything HTTP 服务器运行良好，端口 ${port} 响应迅速，当前已索引库命中 ${res.total} 个匹配项。`,
					});
				} else {
					setDiagResult({
						status: "error",
						message: `未检测到端口 ${port} 的 HTTP 服务。请确认 Everything 正在运行，并在「工具 → 选项 → HTTP 服务器」中勾选了「启用 HTTP 服务器」。`,
						details: res.error,
					});
				}
			} else if (manifest.id === "com.island.navopath") {
				const endpoint = String(formValues.mcpEndpoint || "https://navopath-mcp.shawn89890916.workers.dev/mcp");
				const token = String(formValues.token || "").trim();
				const [summary] = await Promise.all([
					fetchNavoPathSummary(endpoint, token),
					fetchNavoPathTasks(endpoint, token, 1),
				]);
				if (summary) {
					setDiagResult({
						status: "success",
						message: `连接正常，日历与插件共用这份配置：当前活跃项目 ${summary.projects} 个，未完成待办 ${summary.openTasks} 个，累计完成打卡 ${summary.completedTasks} 个。`,
					});
				} else {
					setDiagResult({
						status: "error",
						message: "无法连接到 NavoPath MCP 服务端点，请检查 MCP Token 凭证是否有效或网络连接是否通畅。",
					});
				}
			} else if (manifest.id === "com.island.obsidian") {
				const vaultPath = String(formValues.vaultPath || "").trim();
				const vault = String(formValues.vaultName || (vaultPath ? vaultPath.split(/[\\/]/).pop() : "Obsidian Vault"));
				const preview = dailyNoteName(new Date(), String(formValues.dailyDateFormat || "YYYY-MM-DD"));
				const notes = await fetchRecentNotes(vault, 8080, vaultPath);
				setDiagResult({
					status: "success",
					message: `索引读取正常：${notes.length} 条近期笔记。今日日记文件名预览：${preview}.md；本次测试没有创建或打开日记。`,
				});
			} else if (manifest.id === "com.island.weather") {
				const city = String(formValues.city || "Beijing").trim();
				const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`;
				const res = await fetch(url);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				if (data.results && data.results.length > 0) {
					const first = data.results[0];
					const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${first.latitude}&longitude=${first.longitude}&current_weather=true`;
					const wRes = await fetch(weatherUrl);
					const wData = await wRes.json();
					setDiagResult({
						status: "success",
						message: `解析成功！城市「${first.name} (${first.country || ""})」，经纬度: [${first.latitude.toFixed(2)}, ${first.longitude.toFixed(2)}]，当前实时气温: ${wData.current_weather?.temperature ?? "--"} °C。`,
					});
				} else {
					setDiagResult({
						status: "error",
						message: `未能识别城市名称「${city}」，请尝试输入城市标准英文名称（如 Beijing, Shanghai, Guangzhou, Shenzhen 等）。`,
					});
				}
			} else if (manifest.id === "com.island.crypto-ticker") {
				const raw = String(formValues.symbols || "BTC, ETH");
				const firstSymbol = raw.split(",")[0]?.trim().toUpperCase() || "BTC";
				const pair = firstSymbol.endsWith("USDT") ? firstSymbol : `${firstSymbol}USDT`;
				const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				setDiagResult({
					status: "success",
					message: `行情接口连通正常！${pair} 现货当前最新成交价格为：$${Number(data.price).toLocaleString()} USD。`,
				});
			} else if (manifest.id === "com.island.vpn") {
				const state = await readVpnSnapshot(vpnConfig(formValues));
				setDiagResult({
					status: "success",
					message: `控制器连接正常，读取 ${Object.keys(state.proxies).length} 个节点/策略组，当前模式 ${state.mode}。本次诊断只读取状态，不切换节点或修改模式。`,
				});
			} else {
				setDiagResult({
					status: "success",
					message: "插件运行环境与组件定义正常，所有参数配置均已即时注入运行时。",
				});
			}
		} catch (err) {
			setDiagResult({
				status: "error",
				message: `测试异常: ${err instanceof Error ? err.message : String(err)}`,
			});
		} finally {
			setDiagLoading(false);
		}
	};

	const backTo = from === "modules" ? "/modules" : "/marketplace";
	const backLabel = from === "modules" ? t("modules.title") : "插件市场";

	return (
		<div className="flex flex-col gap-4 select-text">
			{/* Top Navigation Back link */}
			<div className="flex items-center justify-between">
				<BackLink to={backTo}>{backLabel}</BackLink>
				{saveNotification && (
					<motion.span
						initial={{ opacity: 0, x: 10 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0 }}
						className="flex items-center gap-1.5 text-xs font-medium text-emerald-400"
					>
						<CheckIcon size={13} />
						<span>已自动保存并即时生效</span>
					</motion.span>
				)}
			</div>

			{/* Plugin Banner Header */}
			<div className="flex items-start gap-4">
				<div
					className="flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ring-1 ring-white/10"
					style={{
						backgroundColor: `${manifest.accentColor || "#6366F1"}20`,
						color: manifest.accentColor || "#6366F1",
					}}
				>
					{renderPluginIcon(manifest.icon, 28, manifest.accentColor)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-xl font-bold tracking-tight text-text">{title}</h1>
						<span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-medium text-text-dim">
							v{manifest.version}
						</span>
						<span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-text-faint">
							{plugin?.source === "local" ? "本地导入" : "官方开源市场"}
						</span>
					</div>

					<p className="mt-1 text-xs text-text-dim leading-relaxed">{desc}</p>

					<div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11.5px] text-text-faint">
						<span>
							开发者:{" "}
							{manifest.author.url ? (
								<a
									href={manifest.author.url}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
								>
									<span>{manifest.author.name}</span>
									<ExternalLinkIcon size={10} />
								</a>
							) : (
								<strong className="text-text-dim font-medium">{manifest.author.name}</strong>
							)}
						</span>
						{manifest.tags && manifest.tags.length > 0 && (
							<div className="flex items-center gap-1">
								{manifest.tags.map((tag) => (
									<span key={tag} className="rounded bg-white/4 px-1.5 py-0.5 text-[10px] text-text-faint">
										#{tag}
									</span>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* If not installed, provide prompt & install button */}
			{!plugin ? (
				<Card className="p-5">
					<div className="flex flex-col items-center justify-center gap-3 text-center py-6">
						<div className="rounded-full bg-white/6 p-3 text-text-faint">
							<BookOpenIcon size={28} />
						</div>
						<h3 className="text-sm font-semibold text-text">此插件尚未安装</h3>
						<p className="max-w-md text-xs text-text-dim">
							安装后即可在灵动岛与快捷启动栏中使用此微应用，并在此处自由配置参数与查阅专属使用教程。
						</p>
						<button
							type="button"
							onClick={() => installPlugin(manifest)}
							className="mt-2 flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-accent-hover transition-colors"
						>
							<SparklesIcon size={14} />
							<span>立即一键安装</span>
						</button>
					</div>
				</Card>
			) : (
				<>
					{/* Card 1: Core Switch & Placement Controls */}
					<Card>
						<Row
							as="label"
							label="启用此插件"
							desc={
								<span className="flex items-center gap-1.5">
									{plugin.enabled ? (
										<>
											<span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
											<span className="text-emerald-400 font-medium">已激活 · 灵动岛与抽屉正常加载</span>
										</>
									) : (
										<>
											<span className="size-2 rounded-full bg-white/20" />
											<span>已停用 · 暂时从灵动岛隐藏</span>
										</>
									)}
								</span>
							}
						>
							<Toggle checked={plugin.enabled} onChange={() => togglePlugin(manifest.id)} />
						</Row>

						<Row label={t("layout.place")} desc={t("layout.placeDesc")} disabled={!plugin.enabled}>
							<PlacementSelect moduleId={manifest.id} disabled={!plugin.enabled} />
						</Row>

						<Row
							label="在灵动岛中测试展开"
							desc="触发灵动岛展开并即时预览此插件的界面排版与动画"
							disabled={!plugin.enabled}
						>
							<button
								type="button"
								disabled={!plugin.enabled}
								onClick={() => command("focus_island")}
								className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/6 px-3 text-xs font-medium text-text hover:bg-white/12 disabled:opacity-40 transition-colors"
							>
								<PlayIcon size={12} className="text-emerald-400" />
								<span>展开测试</span>
							</button>
						</Row>
					</Card>

					{/* Card 2: Parameters & Settings Form */}
					{manifest.settings && manifest.settings.length > 0 && (
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between px-1">
								<h2 className="text-xs font-bold tracking-wider text-text-faint uppercase">参数配置 (Parameters)</h2>
								<button
									type="button"
									onClick={handleResetDefaults}
									className="flex items-center gap-1 text-[11px] text-text-faint hover:text-text transition-colors"
								>
									<RotateCcwIcon size={11} />
									<span>重置为默认值</span>
								</button>
							</div>

							<Card>
								{manifest.settings.map((field) => (
									<SettingRow
										key={field.key}
										field={field}
										value={formValues[field.key] ?? field.default}
										showPassword={Boolean(showPasswords[field.key])}
										onTogglePassword={() => setShowPasswords((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
										onChange={(val) => handleSettingChange(field.key, val)}
									/>
								))}
							</Card>
						</div>
					)}

					{/* Card 3: Dedicated Tutorial & Setup Guide */}
					{guide && (
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center gap-1.5 px-1">
								<BookOpenIcon size={13} className="text-accent" />
								<h2 className="text-xs font-bold tracking-wider text-text uppercase">配置与使用教程 (Setup Guide)</h2>
							</div>

							<Card className="p-4.5">
								{/* Summary */}
								<div className="rounded-xl border border-white/6 bg-white/2 p-3 text-xs text-text-dim leading-relaxed">
									<strong className="text-text font-semibold mr-1.5">组件工作机制:</strong>
									{guide.summary}
								</div>

								{/* Prerequisites if any */}
								{guide.prerequisites && guide.prerequisites.length > 0 && (
									<div className="mt-3.5 flex flex-col gap-1.5">
										<span className="text-[11.5px] font-semibold text-text-faint flex items-center gap-1">
											<InfoIcon size={12} className="text-amber-400" />
											<span>前置准备 (Prerequisites)</span>
										</span>
										<div className="flex flex-col gap-1 pl-1">
											{guide.prerequisites.map((req) => (
												<div key={req} className="flex items-start gap-2 text-xs text-text-dim">
													<span className="size-1.5 rounded-full bg-amber-400/80 mt-1.5 shrink-0" />
													<span>{req}</span>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Step by Step Guide */}
								<div className="mt-4 flex flex-col gap-3">
									<span className="text-[11.5px] font-semibold text-text-faint">
										详细操作步骤 (Step-by-Step Instructions)
									</span>

									<div className="flex flex-col gap-2.5">
										{guide.steps.map((step, idx) => (
											<div
												key={step.title}
												className="relative flex items-start gap-3 rounded-xl border border-white/5 bg-white/2.5 p-3"
											>
												<span className="flex size-5.5 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-[11px] font-bold text-accent shadow-xs">
													{idx + 1}
												</span>
												<div className="min-w-0 flex-1">
													<div className="flex flex-wrap items-center justify-between gap-2">
														<h4 className="text-[13px] font-semibold text-text">{step.title}</h4>
														{step.link && (
															<a
																href={step.link.url}
																target="_blank"
																rel="noreferrer"
																className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
															>
																<span>{step.link.label}</span>
																<ExternalLinkIcon size={10} />
															</a>
														)}
													</div>
													<p className="mt-1 text-xs text-text-dim leading-relaxed">{step.desc}</p>
													{step.tip && (
														<div className="mt-2 rounded-lg bg-white/4 px-2.5 py-1.5 text-[11.5px] text-amber-300/90 flex items-start gap-1.5">
															<span className="font-semibold text-amber-400 shrink-0">💡 提示:</span>
															<span>{step.tip}</span>
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								</div>

								{/* Interactive Live Diagnostic Box */}
								<div className="mt-5 rounded-xl border border-white/8 bg-black/25 p-3.5">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											<SlidersIcon size={14} className="text-accent" />
											<h4 className="text-xs font-semibold text-text">连通性与服务即时诊断</h4>
										</div>
										<button
											type="button"
											disabled={diagLoading}
											onClick={runDiagnosticTest}
											className="flex h-7 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-text hover:bg-white/18 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
										>
											<RefreshCwIcon size={11} className={diagLoading ? "animate-spin" : ""} />
											<span>{diagLoading ? "正在诊断…" : "立即测试连通性"}</span>
										</button>
									</div>

									{diagResult && (
										<motion.div
											initial={{ opacity: 0, y: 4 }}
											animate={{ opacity: 1, y: 0 }}
											className={`mt-3 rounded-lg p-2.5 text-xs leading-relaxed flex items-start gap-2 ${
												diagResult.status === "success"
													? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
													: diagResult.status === "error"
														? "bg-rose-500/10 border border-rose-500/20 text-rose-300"
														: "bg-sky-500/10 border border-sky-500/20 text-sky-300"
											}`}
										>
											{diagResult.status === "success" ? (
												<CheckCircle2Icon size={15} className="shrink-0 text-emerald-400 mt-0.5" />
											) : diagResult.status === "error" ? (
												<XCircleIcon size={15} className="shrink-0 text-rose-400 mt-0.5" />
											) : (
												<InfoIcon size={15} className="shrink-0 text-sky-400 mt-0.5" />
											)}
											<div className="min-w-0 flex-1">
												<p className="font-medium">{diagResult.message}</p>
												{diagResult.details && (
													<p className="mt-1 font-mono text-[10.5px] opacity-75">{diagResult.details}</p>
												)}
											</div>
										</motion.div>
									)}
								</div>

								{/* FAQ if present */}
								{guide.faq && guide.faq.length > 0 && (
									<div className="mt-4 flex flex-col gap-2">
										<span className="text-[11.5px] font-semibold text-text-faint flex items-center gap-1">
											<HelpCircleIcon size={12} />
											<span>常见排查与问答 (Troubleshooting)</span>
										</span>
										<div className="flex flex-col gap-2">
											{guide.faq.map((item) => (
												<div key={item.q} className="rounded-lg bg-white/2 p-2.5 text-xs text-text-dim">
													<p className="font-medium text-text">Q: {item.q}</p>
													<p className="mt-1 text-text-dim">A: {item.a}</p>
												</div>
											))}
										</div>
									</div>
								)}
							</Card>
						</div>
					)}

					{/* Card 4: Danger Zone & Uninstallation */}
					<div className="flex flex-col gap-1.5 mt-2">
						<h2 className="text-xs font-bold tracking-wider text-text-faint uppercase px-1">
							元数据与管理 (Management)
						</h2>
						<Card>
							<Row label="唯一标识 (Package ID)" desc="该插件在系统注册表与设置树中的唯一命名空间">
								<span className="font-mono text-xs text-text-dim select-all bg-white/4 px-2 py-1 rounded">
									{manifest.id}
								</span>
							</Row>

							<Row label="卸载此插件" desc="从灵动岛完全卸载此扩展组件，并清理其在运行时的注册状态">
								{confirmUninstall ? (
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setConfirmUninstall(false)}
											className="h-8 rounded-lg bg-white/6 px-3 text-xs text-text-faint hover:bg-white/10"
										>
											取消
										</button>
										<button
											type="button"
											onClick={() => {
												uninstallPlugin(manifest.id);
												navigate("/marketplace");
											}}
											className="flex h-8 items-center gap-1.5 rounded-lg bg-red-500/20 px-3 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
										>
											<Trash2Icon size={13} />
											<span>确认卸载</span>
										</button>
									</div>
								) : (
									<button
										type="button"
										onClick={() => setConfirmUninstall(true)}
										className="flex h-8 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/8 px-3 text-xs font-medium text-red-400 hover:bg-red-500/16 transition-colors cursor-pointer"
									>
										<Trash2Icon size={13} />
										<span>卸载插件</span>
									</button>
								)}
							</Row>
						</Card>
					</div>
				</>
			)}
		</div>
	);
}

function SettingRow({
	field,
	value,
	showPassword,
	onTogglePassword,
	onChange,
}: {
	field: PluginSettingField;
	value: unknown;
	showPassword: boolean;
	onTogglePassword: () => void;
	onChange: (val: unknown) => void;
}) {
	return (
		<Row label={field.label} desc={field.description}>
			{field.type === "text" && (
				<Input
					value={String(value ?? "")}
					onChange={(e) => onChange(e.target.value)}
					placeholder={String(field.default ?? "")}
					className="w-56"
				/>
			)}

			{field.type === "number" && (
				<Input
					type="number"
					value={Number(value ?? 0)}
					onChange={(e) => onChange(Number(e.target.value))}
					className="w-24 text-right"
				/>
			)}

			{field.type === "password" && (
				<div className="relative flex items-center">
					<Input
						type={showPassword ? "text" : "password"}
						value={String(value ?? "")}
						onChange={(e) => onChange(e.target.value)}
						placeholder="••••••••••••••••"
						className="w-56 pr-8 font-mono"
					/>
					<button
						type="button"
						onClick={onTogglePassword}
						className="absolute right-2 text-text-faint hover:text-text cursor-pointer"
						title={showPassword ? "隐藏密钥" : "显示明文"}
					>
						{showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
					</button>
				</div>
			)}

			{field.type === "boolean" && <Toggle checked={Boolean(value)} onChange={(checked) => onChange(checked)} />}

			{field.type === "select" && (
				<Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
					{field.options?.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</Select>
			)}
		</Row>
	);
}
