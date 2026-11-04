import { expect, test } from "bun:test";
import { pluginActivities, setPluginActivity } from "./activity";

test("repeated VPN background reports do not invalidate the island snapshot", () => {
	setPluginActivity("vpn-regression", { left: "VPN", right: "Monitoring" });
	const snapshot = pluginActivities.get();
	for (let i = 0; i < 100; i++) {
		setPluginActivity("vpn-regression", { left: "VPN", right: "Monitoring" });
	}
	expect(pluginActivities.get()).toBe(snapshot);
	setPluginActivity("vpn-regression", { left: "VPN", right: "Testing" });
	expect(pluginActivities.get()).not.toBe(snapshot);
	expect(pluginActivities.get()["vpn-regression"].right).toBe("Testing");
	setPluginActivity("vpn-regression", null);
	const removed = pluginActivities.get();
	setPluginActivity("vpn-regression", null);
	expect(pluginActivities.get()).toBe(removed);
});
