# NavoPath integration

Desktop MCP requests use the native `navopath_mcp_request` command. NavoPath's
deployed OPTIONS response does not allow the MCP session header, even though
the initialization POST exposes it. Browser fetch therefore fails after the
initial handshake. The native command preserves response status/session headers,
has a 20-second timeout and a 4 MiB response cap, and never follows redirects
with credentials. It accepts HTTPS endpoints and loopback HTTP, and only the
four NavoPath tools used by this integration.

The shared client completes the initialized notification, shares concurrent
initialization, negotiates the protocol version, supports JSON and SSE, and
reinitializes once after HTTP 404 session expiry. Other failed writes are never
automatically replayed. Task reads use `completed: false`; creation includes a
fresh idempotency key. The calendar and plugin use the same client and data hook.

Configure a personal token in the plugin settings. There are no embedded token
defaults. Existing saved settings are retained. Missing credentials show the
configuration form. Failed refreshes retain the current account's last loaded
tasks; failed writes leave tasks/counts unchanged and preserve the draft input.
Changing accounts/endpoints clears displayed data. The visible panel refreshes
every minute, on network recovery, or through its refresh button.

## Design and brand assets

Source of truth: [NavoPathStyle.md](https://github.com/shawn89890916/NavoPath-planner/blob/main/NavoPathStyle.md).
The widget follows its graphite palette, fine neutral rules, compact operational
type, and stone interaction accent. Color is reserved for alert text. Task rows
use checkboxes with explicit labels; clicking a title does not complete a task.
The task list owns its wheel scrolling. Keyboard focus uses a 2px stone outline.

`src/assets/navopath.png` is the official transparent PNG from NavoPath's
`public/navopath-icon.png`, with a white front-facing N and black extrusion.
The same asset supplies the launcher, collapsed view, calendar and widget.

## Verification

- `bun run lint`
- `bun run build`
- `bun test src/core/plugins/navopathMcp.test.ts`
- In `src-tauri`: `cargo clippy -- -D warnings` and `cargo test --lib`
- Browser: connected/empty/error states, refresh retention, failed/successful
  creation and completion, input focus and list scrolling.
- Desktop: real native handshake and read-only task/summary requests using
  the user's saved settings. Browser fixtures never mutate the live workspace.
