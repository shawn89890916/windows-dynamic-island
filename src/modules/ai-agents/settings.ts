import type { SettingDef } from "../../core/settings";

export const agentSettings = {
	/** Also read by the backend (`providers/claude/permissions.rs`). */
	approveInIsland: {
		key: "agents.approveInIsland",
		label: "agents.approveInIsland.label",
		description: "agents.approveInIsland.desc",
		default: true,
	},
	peekOnWaiting: {
		key: "agents.peekOnWaiting.label",
		label: "agents.peekOnWaiting.label",
		description: "agents.peekOnWaiting.desc",
		default: true,
	},
	peekOnDone: {
		key: "agents.peekOnDone.label",
		label: "agents.peekOnDone.label",
		default: false,
	},
	peekOnLimitsReset: {
		key: "agents.peekOnLimitsReset.label",
		label: "agents.peekOnLimitsReset.label",
		description: "agents.peekOnLimitsReset.desc",
		default: true,
	},
} satisfies Record<string, SettingDef>;

export const agentUsageAlertSettings = {
	fiveHour: {
		key: "agents.usageAlert.fiveHour",
		label: "agents.alert.fiveHour.label",
		description: "agents.alert.fiveHour.desc",
		default: 80,
	} satisfies SettingDef<number>,
	weekly: {
		key: "agents.usageAlert.weekly",
		label: "agents.alert.weekly.label",
		description: "agents.alert.weekly.desc",
		default: 80,
	} satisfies SettingDef<number>,
};

/**
 * Sounds for a session that finished or asks for permission, with the audio
 * file to play (`null`: the one shipped with the app). Read by the backend
 * (`providers/claude/sounds.rs`); shown in `ClaudeSettings`.
 */
export const claudeSounds = {
	done: {
		enabled: { key: "agents.soundDone", label: "claude.sound.done", default: false } as SettingDef,
		file: { key: "agents.soundDoneFile", label: "claude.sound.done", default: null } as SettingDef<string | null>,
	},
	permission: {
		enabled: { key: "agents.soundPermission", label: "claude.sound.permission", default: false } as SettingDef,
		file: { key: "agents.soundPermissionFile", label: "claude.sound.permission", default: null } as SettingDef<
			string | null
		>,
	},
};
