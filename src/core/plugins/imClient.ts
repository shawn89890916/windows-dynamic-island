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

export const INITIAL_IM_MESSAGES: ImMessage[] = [];

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
