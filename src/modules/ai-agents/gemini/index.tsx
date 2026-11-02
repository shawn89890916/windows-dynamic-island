import type { AgentDefinition } from "../common/types";
import { GeminiIcon } from "./GeminiIcon";
import { useGemini } from "./useGemini";

export const geminiAgent: AgentDefinition = {
	id: "gemini",
	name: "Gemini / Antigravity",
	color: "#388BFD",
	Icon: GeminiIcon,
	useAgent: useGemini,
	usageUrl: "https://aistudio.google.com",
	openSession: (session) => {
		if (session.cwd) {
			window.open(`vscode://file/${encodeURIComponent(session.cwd.replace(/\\/g, "/"))}`, "_blank");
		}
	},
	launchApp: () => {
		if (typeof window !== "undefined") {
			const a = document.createElement("a");
			a.href = "antigravity://";
			a.target = "_blank";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}
	},
};
