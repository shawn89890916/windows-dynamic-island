# Connection audit — 2026-11-03

Scope: read-only review of marketplace connections and their setup/diagnostic
flows, against the current repository plus the NavoPath fixes. Findings below
are not changes to the other integrations. No messages, notes or prompts were
sent or created for testing.

Update for v0.4.10: the owner subsequently authorized VPN and Obsidian repairs.
VPN now uses a real local controller with bounded periodic probes, verified
selection and opt-in allowlisted failover. Obsidian settings are consolidated,
daily-note naming is configurable, and diagnostics no longer open notes.
The built-in AI panel also has real Antigravity quota reads and truthful
copy-and-open wording. The separate marketplace AI Hub finding below remains.
See `connections-v0.4.10.md` for current setup and validation boundaries.

## Confirmed findings

| Priority | Connection | Finding and impact | Owning source |
| --- | --- | --- | --- |
| P1 | VPN | `pingProxy` issues an ordinary browser HEAD request and never receives the configured proxy port. Any reachable target can be reported as a connected proxy. The mode buttons only change React state. The diagnostic also reports a probe without sending one. | `src/core/plugins/vpnClient.ts:32`; `widgets/VpnWidget.tsx:21,105`; `src/settings/pages/PluginPage.tsx`, VPN diagnostic branch |
| P1 | VPN refresh | `handlePing` depends on `isPinging`, while the effect depends on `handlePing`. Switching the loading flag recreates the callback and reruns the effect; completion starts another probe. An enabled widget can continuously issue requests. | `src/core/plugins/widgets/VpnWidget.tsx:14–32` |
| P1 | WeChat/QQ marketplace widget | The message list starts as a fixed empty array and has no notification-provider subscription. The UI always displays both clients as connected. Its read/clear actions affect only local React state. The separate built-in Windows notification module is outside this finding. Reply copies text and launches an app; it does not send a message. | `src/core/plugins/widgets/ImNotificationWidget.tsx:47,121`; `src/core/plugins/imClient.ts:17,27` |
| P1 | AI Hub launch | Buttons send `claude://`, `codex://`, or `chatgpt://` directly to the shell. The native open command discards the ShellExecute result, and the widget immediately clears the prompt and reports dispatch. On devices without these protocol handlers the launch can fail while reporting success. Clipboard writes are also not awaited. | `src/core/plugins/widgets/AiHubWidget.tsx:118–135`; `src-tauri/src/settings.rs`, `open_url` |
| P1 | Fork updater | The updater endpoint still points to `HeyyCzer/windows-island`, rather than this fork; updater artifacts are disabled. Publishing a release to this fork does not establish an automatic update path for existing installs. Users should download this fork's latest installer manually. | `src-tauri/tauri.conf.json:54,60`; `src-tauri/src/updater.rs` |
| P2 | Obsidian | Connected status is unconditional. Recent-note discovery maps both an unavailable Everything server and a genuinely empty vault to an empty array, so failure looks like an empty connected vault. The diagnostic launches the vault and daily-note URI rather than validating the connection. | `src/core/plugins/widgets/ObsidianWidget.tsx:226`; `src/core/plugins/obsidianClient.ts`, `fetchRecentNotes`; `src/settings/pages/PluginPage.tsx`, Obsidian diagnostic branch |
| P2 | Generic diagnostics | The default diagnostic branch reports success without checking the target service. Weather's forecast response is decoded without checking HTTP status; Steam's player-summary response similarly lacks an HTTP status check. | `src/settings/pages/PluginPage.tsx`, weather/default diagnostic branches; `src/core/plugins/widgets/SteamFriendsWidget.tsx`, `fetchSteamFriends` |

## Validation boundaries

- Everything: a local HTTP read returned the expected JSON result shape and an
  indexed-file count. No files were opened or changed.
- Open-Meteo: the geocoding endpoint returned HTTP 200 from this machine.
- Binance: TLS handshake failed in this machine's read-only probe. This is an
  observed transport failure, not proof of a universal service outage.
- Steam: no configured API key was available for an authenticated runtime test.
- Protocol registration was checked read-only. Registration alone does not prove
  a vault/account is correct, and an installed app need not register every URI.
- NavoPath: addressed separately in `navopath-integration.md`, including shared
  credentials, real desktop MCP reads, date selection and failure states.

Recommended repair order: truthful connection/dispatch states and non-destructive
error handling; native proxy/controller integration; real notification-provider
subscription; Obsidian discovery errors; then a signed updater owned by this fork.
