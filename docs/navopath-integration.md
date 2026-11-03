# NavoPath integration

## 三步连接（v0.4.8 及以上）

1. 从[本仓库最新版](https://github.com/shawn89890916/windows-dynamic-island/releases/latest)
   下载安装程序。在 NavoPath 登录自己的云端账户，前往 **设置 → 日历与集成 → MCP**，
   按设备名生成个人令牌（旧版「日历与集成」位于「高级」中）。完整的 `nvp_...` 原文只显示一次，请立即复制。
2. 在灵动岛 **设置 → 插件市场 → NavoPath 规划器** 中安装/启用插件，填写个人 Token。
   默认服务地址为 `https://navopath-mcp.shawn89890916.workers.dev/mcp`，通常无需修改。
   输入会自动保存，点击教程下方 **立即测试连通性**；显示项目、待办统计才表示验证成功。
3. 打开灵动岛的 NavoPath 页或 **时钟与日历 → NavoPath**。两处共用这份连接配置，
   无需再次粘贴 Token；日历设置中可开关集成。日历配置入口也会直接打开这份插件配置。

每位用户使用自己的设备令牌，没有内置公共/测试凭据。网页预览使用浏览器网络限制，
正式桌面程序通过原生网络层访问 MCP。授权失败时检查令牌是否完整、有效且属于自己的账户。
网络失败可以刷新重试；撤销令牌后需在共享连接设置中更新。

日历按未完成任务的有效排期、计划日期和截止日期显示标记。点击日期查看该日任务，
跨日排期可以出现在两天；旧的已取消/退回记录不会单独生成标记。未标日期的任务仅列在今天，
不会给每个日期添加圆点。日历读取完整待办，不受插件十条预览的限制。
快速添加捕获普通待办，不会自动给它设定截止日期或时间。

旧版本仅保存在日历里的凭据会在共享插件尚未配置时继续使用。
保存插件凭据后以插件配置为准；显式清空插件 Token 会断开两处连接。

## Transport

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
Changing accounts/endpoints clears displayed data. The active account's workspace is retained in memory across page switches, and
concurrent reads share one request. Reopening a view within a minute reuses the
workspace immediately. Stale data refreshes in the background without replacing
the connected label with an initial-connection screen. The visible panel refreshes
every minute, on network recovery, or through its refresh button. Closing the app
clears the cache; explicit credential changes replace it.

## Design and brand assets

Source of truth: [NavoPathStyle.md](https://github.com/shawn89890916/NavoPath-planner/blob/main/NavoPathStyle.md).
The widget follows its graphite palette, fine neutral rules, compact operational
type, and stone interaction accent. Color is reserved for alert text. Task rows
use checkboxes with explicit labels; clicking a title does not complete a task.
The task list owns its wheel scrolling. Keyboard focus uses a 2px stone outline.

`src/assets/navopath.png` is a 96 px, transparent derivative of NavoPath's
`public/navopath-icon.png`, with the original white front-facing N and black
extrusion. The 3.5 kB asset preserves the original silhouette; the editable SVG
in that project has a different silhouette and is not used here. The old
1024 px asset was 206 kB.
The same asset supplies the launcher, collapsed view, calendar and widget.

## Verification

- `bun run lint`
- `bun run build`
- `bun test src/core/plugins/navopathMcp.test.ts src/core/plugins/navopathConnection.test.ts src/modules/clock/navopathCalendar.test.ts`
- In `src-tauri`: `cargo clippy -- -D warnings` and `cargo test --lib`
- Browser: connected/empty/error states, refresh retention, failed/successful
  creation and completion, input focus and list scrolling.
- Desktop: real native handshake and read-only task/summary requests using
  the user's saved settings. Browser fixtures never mutate the live workspace.

Reopen regression check: navigate Calendar → NavoPath → Calendar three times
within a minute. The connected state and rows should appear immediately; the
initial load should account for just one initialize call and two read-tool calls
in total. Clearing/changing credentials must replace the workspace immediately.
