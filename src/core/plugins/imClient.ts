/**
 * WeChat & QQ desktop notifications and launcher client for Windows Dynamic Island.
 */

export interface ImMessage {
	id: string;
	app: "wechat" | "qq";
	sender: string;
	group?: string;
	content: string;
	timestamp: number;
	unread: boolean;
	avatarColor: string;
}

export const INITIAL_IM_MESSAGES: ImMessage[] = [
	{
		id: "wx-1",
		app: "wechat",
		sender: "文件传输助手",
		content: "已同步桌面备忘录与最新项目规划草稿.md",
		timestamp: Date.now() - 3 * 60_000,
		unread: true,
		avatarColor: "#07C160",
	},
	{
		id: "qq-1",
		app: "qq",
		sender: "前端架构协同群",
		group: "技术研发中心",
		content: "灵动岛全新插件市场规范与 Apple HIG 规范已通过审核！",
		timestamp: Date.now() - 8 * 60_000,
		unread: true,
		avatarColor: "#12B7F5",
	},
	{
		id: "wx-2",
		app: "wechat",
		sender: "产品经理 - Shawn",
		content: "Everything 极速搜索和 Obsidian 联动体验非常丝滑！",
		timestamp: Date.now() - 25 * 60_000,
		unread: false,
		avatarColor: "#07C160",
	},
];

export function openWeChat() {
	if (typeof window !== "undefined") {
		const a = document.createElement("a");
		a.href = "weixin://";
		a.target = "_blank";
		a.rel = "noopener noreferrer";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
}

export function openQQ() {
	if (typeof window !== "undefined") {
		const a = document.createElement("a");
		a.href = "tencent://";
		a.target = "_blank";
		a.rel = "noopener noreferrer";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
}

export function dispatchQuickReply(app: "wechat" | "qq", text: string) {
	if (!text.trim()) return;
	if (navigator.clipboard) {
		navigator.clipboard.writeText(text.trim());
	}
	if (app === "wechat") {
		openWeChat();
	} else {
		openQQ();
	}
}
