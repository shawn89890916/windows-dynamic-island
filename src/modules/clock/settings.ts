import type { SettingDef } from "../../core/settings";

export const calendarSettings = {
	remind: {
		key: "calendar.remind",
		label: "calendar.remind.label",
		description: "calendar.remind.desc",
		default: true,
	},
} satisfies Record<string, SettingDef>;

/** Use an event's own notifications instead of `remindMinutes` when it has any. */
export const eventReminders: SettingDef = {
	key: "calendar.eventReminders",
	label: "calendar.eventReminders.label",
	description: "calendar.eventReminders.desc",
	default: true,
};

/** Play Windows' reminder sound when a reminder goes off. */
export const remindSound: SettingDef = {
	key: "calendar.remindSound",
	label: "calendar.remindSound.label",
	description: "calendar.remindSound.desc",
	default: false,
};

/** Minutes before an event its reminders go off (a single number in older versions). */
export const remindMinutes: SettingDef<number[] | number> = {
	key: "calendar.remindMinutes",
	label: "calendar.remindMinutes.label",
	default: [10],
};

/** `remindMinutes` as a list, latest first. */
export const leadList = (value: number[] | number) =>
	[...new Set(Array.isArray(value) ? value : [value])].sort((a, b) => a - b);

/** Calendar key → shown, overriding its default; also read by the backend. */
export const calendarVisibility: SettingDef<Record<string, boolean>> = {
	key: "calendar.visibility",
	label: "calendar.calendars.title",
	default: {},
};

export const navopathSettings = {
	enabled: {
		key: "calendar.navopath.enabled",
		label: "calendar.navopath.label",
		description: "calendar.navopath.desc",
		default: true,
	},
	endpoint: {
		key: "calendar.navopath.endpoint",
		label: "calendar.navopath.endpointLabel",
		default: "https://navopath-mcp.shawn89890916.workers.dev/mcp",
	},
	token: {
		key: "calendar.navopath.token",
		label: "calendar.navopath.tokenLabel",
		default: "nvp_13bded77b94e65938c7487640e6b94a15d29de62326c7085fb40c3409d6f252e",
	},
} satisfies {
	enabled: SettingDef<boolean>;
	endpoint: SettingDef<string>;
	token: SettingDef<string>;
};
