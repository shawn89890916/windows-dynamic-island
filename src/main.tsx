import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Island } from "./components/Island";
import { isTauri, startBridge } from "./core/bridge";
import { startSettings } from "./core/settings";
import { PipApp } from "./pip/PipApp";
import { SettingsApp } from "./settings/SettingsApp";
import "./styles.css";

startBridge();
startSettings();

// No browser context menu (reload, inspect…) in release builds.
if (import.meta.env.PROD) document.addEventListener("contextmenu", (e) => e.preventDefault());

function RootApp() {
	const [label, setLabel] = useState(isTauri ? getCurrentWindow().label : location.hash.slice(1) || "island");

	useEffect(() => {
		if (isTauri) return;
		const update = () => {
			const current = location.hash.slice(1) || "island";
			setLabel(current);
			if (current === "island") {
				document.body.classList.add("preview");
			} else {
				document.body.classList.remove("preview");
			}
		};
		update();
		window.addEventListener("hashchange", update);
		return () => window.removeEventListener("hashchange", update);
	}, []);

	return (
		<>
			{!isTauri && (
				<div className="fixed right-3 bottom-3 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-3 py-1.5 text-xs text-white/80 shadow-lg backdrop-blur-md">
					<span className="text-white/40">预览模式:</span>
					<button
						type="button"
						onClick={() => {
							window.location.hash = label === "settings" ? "island" : "settings";
						}}
						className="cursor-pointer font-medium text-accent hover:underline"
					>
						{label === "settings" ? "切回灵动岛 (#island)" : "⚙️ 打开设置 (#settings)"}
					</button>
				</div>
			)}
			{label === "settings" ? <SettingsApp /> : label === "pip" ? <PipApp /> : <Island />}
		</>
	);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<RootApp />
	</React.StrictMode>,
);
