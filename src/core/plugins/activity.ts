import { createStore } from "../island";

export interface PluginActivity {
	active?: boolean;
	priority?: number;
	left?: string;
	right?: string;
	progress?: number;
	accent?: string;
}
export const pluginActivities = createStore<Record<string, PluginActivity>>({});
export function setPluginActivity(id: string, value: PluginActivity | null) {
	const previous = pluginActivities.get()[id];
	if (!value && !previous) return;
	if (
		value &&
		previous &&
		(["active", "priority", "left", "right", "progress", "accent"] as const).every((key) =>
			Object.is(previous[key], value[key]),
		)
	)
		return;
	pluginActivities.set((s) => {
		const next = { ...s };
		if (value) next[id] = value;
		else delete next[id];
		return next;
	});
}
