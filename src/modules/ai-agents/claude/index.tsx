/**
 * Claude Code agent. Backend: `src-tauri/src/providers/claude/`.
 */
import { providerAction } from "../../../core/bridge";
import type { AgentDefinition } from "../common/types";
import { ClaudeIcon } from "./ClaudeIcon";
import { ClaudeSettings } from "./ClaudeSettings";
import { useClaude } from "./useClaude";

export const claudeAgent: AgentDefinition = {
	id: "claude",
	name: "Claude",
	color: "#D97757",
	Icon: ClaudeIcon,
	useAgent: useClaude,
	usageUrl: "https://claude.ai/settings/usage",
	openSession: (session) => {
		if (session.cwd) providerAction("claude", "openProject", session.cwd);
	},
	launchApp: () => {
		if (typeof window !== "undefined") {
			const a = document.createElement("a");
			a.href = "claude://";
			a.target = "_blank";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}
	},
	decide: (session, decision) => providerAction("claude", "permission", { id: session.permission?.id, decision }),
	SettingsSection: ClaudeSettings,
};
