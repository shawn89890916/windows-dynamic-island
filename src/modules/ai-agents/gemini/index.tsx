import { providerAction } from "../../../core/bridge";
import type { AgentDefinition } from "../common/types";
import { GeminiIcon } from "./GeminiIcon";
import { useGemini } from "./useGemini";

export const geminiAgent: AgentDefinition = {
	id: "gemini",
	name: "Antigravity",
	color: "#388BFD",
	Icon: GeminiIcon,
	useAgent: useGemini,
	usageUrl: "https://aistudio.google.com",
	launchApp: () => providerAction("gemini", "launch").then(() => {}),
};
