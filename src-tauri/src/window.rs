//! Island window placement and click-through handling.
//!
//! The window is a transparent overlay strip spanning the full width of a
//! monitor's top edge (which one: see `display.rs`), so the island can be dragged left/right inside
//! it. Everything outside the island shape must let clicks
//! pass through to the apps below, so the window ignores cursor events by
//! default and a background thread turns them back on only while the cursor
//! is inside one of the rects reported by the frontend.

use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, AtomicIsize, AtomicU64, Ordering};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

pub const ISLAND_LABEL: &str = "island";
pub const HOVER_EVENT: &str = "island://hover";
pub const FULLSCREEN_EVENT: &str = "island://fullscreen";
/// Tray "Recenter": the frontend snaps the island back to the middle.
pub const RECENTER_EVENT: &str = "island://recenter";
/// Sample quickly enough that pointer movement across the thin top toolbar is not skipped.
const HIT_TEST_INTERVAL: Duration = Duration::from_millis(10);
/// Re-assert z-order periodically because other topmost overlays can be raised without focus changes.
const TOPMOST_REASSERT_TICKS: u32 = 120;

/// Strip height in logical pixels (fits the tallest expanded panel + shadow + top margin).
pub const STRIP_HEIGHT: f64 = 760.0;

/// The last window in front that wasn't one of ours: what "ask about the
/// screen" captures, and where focus goes back to after typing in the island.
static LAST_FOREGROUND: AtomicIsize = AtomicIsize::new(0);

#[cfg(windows)]
pub fn last_foreground() -> Option<windows::Win32::Foundation::HWND> {
    let raw = LAST_FOREGROUND.load(Ordering::Relaxed);
    (raw != 0).then_some(windows::Win32::Foundation::HWND(raw as *mut _))
}

#[cfg(windows)]
fn track_foreground(app: &AppHandle) {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    let fg = unsafe { GetForegroundWindow() };
    if fg.is_invalid() {
        return;
    }
    let ours = app
        .webview_windows()
        .values()
        .any(|w| w.hwnd().is_ok_and(|h| h.0 == fg.0));
    if !ours {
        LAST_FOREGROUND.store(fg.0 as isize, Ordering::Relaxed);
    }
}

#[cfg(not(windows))]
fn track_foreground(_: &AppHandle) {}

/// Lets the island take keyboard focus (typing a question).
#[tauri::command]
pub fn focus_island(app: AppHandle) -> Result<(), String> {
    let win = app.get_webview_window(ISLAND_LABEL).ok_or("no island window")?;
    allow_activation();
    win.set_focus().map_err(|e| e.to_string())
}

/// Until when (`GetTickCount64`, ms) the island may become the active window.
static ACTIVATE_UNTIL: AtomicU64 = AtomicU64::new(0);
/// Long enough for the queued `set_focus` to run.
const ACTIVATE_GRACE_MS: u64 = 1000;

/// The island normally never takes the focus (see `make_overlay`); call this
/// right before activating it on purpose, to type in it.
pub fn allow_activation() {
    ACTIVATE_UNTIL.store(tick_ms() + ACTIVATE_GRACE_MS, Ordering::Relaxed);
}

#[cfg(windows)]
fn activation_allowed() -> bool {
    FILE_DRAG.load(Ordering::Relaxed) || tick_ms() < ACTIVATE_UNTIL.load(Ordering::Relaxed)
}

/// Files are being dragged in from another app. OLE refuses to drop on a
/// window that can't be activated, so meanwhile the island may be.
static FILE_DRAG: AtomicBool = AtomicBool::new(false);

#[cfg(windows)]
fn set_file_drag(win: &WebviewWindow, on: bool) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{GWL_EXSTYLE, GetWindowLongW, SetWindowLongW, WS_EX_NOACTIVATE};

    FILE_DRAG.store(on, Ordering::Relaxed);
    if on {
        // WebView2 may have made new windows since the last drag: hook them too.
        let w = win.clone();
        let _ = win.run_on_main_thread(move || crate::file_drop::hook(w.app_handle(), &w));
    }
    let Ok(hwnd) = win.hwnd() else {
        return;
    };
    // The subclass puts `WS_EX_NOACTIVATE` back unless a drag is on.
    unsafe {
        let hwnd = HWND(hwnd.0);
        SetWindowLongW(hwnd, GWL_EXSTYLE, GetWindowLongW(hwnd, GWL_EXSTYLE) & !(WS_EX_NOACTIVATE.0 as i32));
    }
}

#[cfg(not(windows))]
fn set_file_drag(_: &WebviewWindow, on: bool) {
    FILE_DRAG.store(on, Ordering::Relaxed);
}

#[cfg(windows)]
fn tick_ms() -> u64 {
    unsafe { windows::Win32::System::SystemInformation::GetTickCount64() }
}

#[cfg(not(windows))]
fn tick_ms() -> u64 {
    0
}

/// Gives the keyboard back to the app used before the island (Esc).
#[tauri::command]
pub fn restore_focus() {
    #[cfg(windows)]
    if let Some(hwnd) = last_foreground() {
        use windows::Win32::UI::WindowsAndMessaging::SetForegroundWindow;
        let _ = unsafe { SetForegroundWindow(hwnd) };
    }
}

#[tauri::command]
pub fn is_fullscreen_active(app: AppHandle) -> bool {
    app.get_webview_window(ISLAND_LABEL)
        .map(|w| fullscreen_app_active(&w))
        .unwrap_or(false)
}

/// Rect in CSS pixels relative to the window's top-left corner.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HitRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    #[serde(default)]
    pub module_id: Option<String>,
}

#[derive(Default)]
pub struct HitState(pub Mutex<Vec<HitRect>>);

#[tauri::command]
pub fn set_hit_rects(state: tauri::State<HitState>, rects: Vec<HitRect>) {
    *state.0.lock().unwrap() = rects;
}

/// While the island is being dragged the whole window takes the cursor, so
/// the drag survives the pointer leaving the island's shape.
#[derive(Default)]
pub struct DragState(pub AtomicBool);

#[tauri::command]
pub fn set_dragging(state: tauri::State<DragState>, dragging: bool) {
    state.0.store(dragging, Ordering::Relaxed);
}

/// Cursor over the island (as last reported by the hit-test thread).
static HOVERING: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct HoverChange {
    inside: bool,
    cursor_moved: bool,
    module_id: Option<String>,
}

/// The user is hovering or dragging the island: don't move it away.
pub fn is_interacting(app: &AppHandle) -> bool {
    HOVERING.load(Ordering::Relaxed) || app.state::<DragState>().0.load(Ordering::Relaxed)
}

/// 暂时隐藏整个透明窗口，让 Windows 找到下方应用的投放目标。
#[cfg(windows)]
pub fn without_drop_overlay<R>(win: &WebviewWindow, drag: impl FnOnce() -> R) -> R {
    use windows::Win32::Foundation::HWND;

    without_native_drop_overlay(win.hwnd().ok().map(|hwnd| HWND(hwnd.0)), drag)
}

#[cfg(not(windows))]
pub fn without_drop_overlay<R>(_: &WebviewWindow, drag: impl FnOnce() -> R) -> R {
    drag()
}

#[cfg(windows)]
fn without_native_drop_overlay<R>(
    hwnd: Option<windows::Win32::Foundation::HWND>,
    drag: impl FnOnce() -> R,
) -> R {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{IsWindowVisible, SW_HIDE, SW_SHOWNA, ShowWindow};

    struct Restore(Option<HWND>);
    impl Drop for Restore {
        fn drop(&mut self) {
            if let Some(hwnd) = self.0 {
                unsafe {
                    let _ = ShowWindow(hwnd, SW_SHOWNA);
                }
            }
            crate::blur::set_outgoing_drag(false);
        }
    }

    let restore = Restore(hwnd.filter(|hwnd| unsafe { IsWindowVisible(*hwnd).as_bool() }));
    if let Some(hwnd) = restore.0 {
        unsafe {
            let _ = ShowWindow(hwnd, SW_HIDE);
        }
    }
    crate::blur::set_outgoing_drag(true);
    drag()
}

#[cfg(all(test, windows))]
mod drop_overlay_tests {
    use super::without_native_drop_overlay;
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DestroyWindow, IsWindowVisible, SW_SHOWNA, ShowWindow, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
        WS_POPUP,
    };
    use windows::core::w;

    #[test]
    fn drop_overlay_stays_hidden_during_drag_and_restores_only_if_visible() {
        unsafe {
            let hwnd = CreateWindowExW(
                WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE,
                w!("STATIC"), w!(""), WS_POPUP, -20_000, -20_000, 100, 100, None, None, None, None,
            )
            .unwrap();
            without_native_drop_overlay(Some(hwnd), || assert!(!IsWindowVisible(hwnd).as_bool()));
            assert!(!IsWindowVisible(hwnd).as_bool());

            let _ = ShowWindow(hwnd, SW_SHOWNA);
            assert!(IsWindowVisible(hwnd).as_bool());
            let result = without_native_drop_overlay(Some(hwnd), || {
                assert!(!IsWindowVisible(hwnd).as_bool());
                Err::<(), _>("取消拖放")
            });
            assert!(IsWindowVisible(hwnd).as_bool());
            assert!(result.is_err());
            DestroyWindow(hwnd).unwrap();
        }
    }
}

pub fn spawn_hit_test(app: AppHandle) {
    std::thread::spawn(move || {
        let mut ignoring: Option<bool> = None;
        let mut hovering = false;
        let mut hovered_module: Option<String> = None;
        let mut last_cursor = None;
        let mut left_without_moving = false;
        let mut fullscreen = false;
        let mut hide_in_fullscreen = true;
        let mut mac_camera_visible = false;
        let mut was_visible = true;
        let mut tick = 0u32;
        let mut last_fg = 0isize;
        let mut button_down = false;
        let mut pressed_inside = false;
        let mut file_drag = false;
        loop {
            std::thread::sleep(HIT_TEST_INTERVAL);
            if crate::file_drop::outgoing_active() {
                continue;
            }
            let Some(win) = app.get_webview_window(ISLAND_LABEL) else {
                continue;
            };

            // Poll native window state less often than cursor position.
            let mut fullscreen_left = false;
            let poll_window_state = tick.is_multiple_of(12);
            if poll_window_state {
                hide_in_fullscreen = app
                    .state::<crate::settings::Settings>()
                    .get("island.hideInFullscreen")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(true);
                let fs = fullscreen_app_active(&win);
                mac_camera_visible = fs
                    && hide_in_fullscreen
                    && crate::capture_privacy::mac_appearance_enabled(app.state::<crate::settings::Settings>().inner());
                if fs != fullscreen {
                    fullscreen = fs;
                    fullscreen_left = !fs;
                    let _ = app.emit(FULLSCREEN_EVENT, fs);
                }
            }
            tick = tick.wrapping_add(1);
            if tick.is_multiple_of(4) {
                track_foreground(&app);
            }

            let fg = foreground_window();
            let fg_changed = fg != last_fg;
            last_fg = fg;
            let island_interactive = !fullscreen || !hide_in_fullscreen;
            let visible = island_interactive || mac_camera_visible;
            let visibility_changed = visible != was_visible;
            was_visible = visible;
            if visible {
                // Explorer can raise the taskbar without changing the foreground window.
                let taskbar_above = poll_window_state && top_taskbar_above(&win);
                // Keep the taskbar overlay visible even when our settings window is open.
                if taskbar_above || !crate::settings::is_open() {
                    ensure_topmost(
                        &win,
                        fg_changed
                            || fullscreen_left
                            || visibility_changed
                            || taskbar_above
                            || tick.is_multiple_of(TOPMOST_REASSERT_TICKS),
                    );
                }
            }

            let dragging = app.state::<DragState>().0.load(Ordering::Relaxed);
            let cursor = cursor_pos();
            let cursor_moved = cursor != last_cursor;
            last_cursor = cursor;
            let over_island = cursor_inside(&app, &win, cursor, 0.0);
            let over_module = hit_module_at(&app, &win, cursor);
            let inside = island_interactive && (dragging || over_island);

            // A drag that started in another app (files from Explorer…). The
            // island is a thin target and the drop target must be under the
            // cursor the moment OLE looks for it, so a wider zone around the
            // island takes the cursor while the button is held. The other app
            // keeps the mouse capture, so nothing is stolen if it isn't a file.
            let down = left_button_down();
            if down && !button_down {
                pressed_inside = over_island;
            }
            button_down = down;
            let drop_zone = island_interactive
                && down
                && !pressed_inside
                && cursor_inside(&app, &win, cursor, DROP_MARGIN);
            let dragging_in = down && !pressed_inside && (file_drag || drop_zone);
            if dragging_in != file_drag {
                file_drag = dragging_in;
                set_file_drag(&win, file_drag);
            }

            let ignore = !inside && !drop_zone;
            if ignoring != Some(ignore) && win.set_ignore_cursor_events(ignore).is_ok() {
                ignoring = Some(ignore);
            }
            // Movement after a stationary exit ends any resize grace period.
            let module_changed = inside && over_module != hovered_module;
            if inside != hovering || module_changed || (left_without_moving && cursor_moved) {
                hovering = inside;
                hovered_module = if inside { over_module.clone() } else { None };
                left_without_moving = !inside && !cursor_moved;
                HOVERING.store(inside, Ordering::Relaxed);
                let _ = app.emit(
                    HOVER_EVENT,
                    HoverChange {
                        inside,
                        cursor_moved,
                        module_id: if inside { over_module } else { None },
                    },
                );
            }
        }
    });
}

/// Extra room (CSS px) around the island that accepts files dragged in.
const DROP_MARGIN: f64 = 48.0;

#[cfg(windows)]
fn left_button_down() -> bool {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
    unsafe { GetAsyncKeyState(VK_LBUTTON.0 as i32) as u16 & 0x8000 != 0 }
}

#[cfg(not(windows))]
fn left_button_down() -> bool {
    false
}

/// Cursor over one of the frontend's rects, grown by `margin` CSS px.
fn cursor_inside(
    app: &AppHandle,
    win: &WebviewWindow,
    cursor: Option<(f64, f64)>,
    margin: f64,
) -> bool {
    let Some((cx, cy)) = cursor else {
        return false;
    };
    // Hit rectangles come from DOM client coordinates, so anchor them at the
    // WebView's client origin instead of the top-level window frame origin.
    let (Ok(origin), Ok(scale)) = (win.inner_position(), win.scale_factor()) else {
        return false;
    };
    let rects = app.state::<HitState>();
    let rects = rects.0.lock().unwrap();
    point_in_hit_rects(cx, cy, origin.x as f64, origin.y as f64, scale, &rects, margin)
}

fn hit_module_at(
    app: &AppHandle,
    win: &WebviewWindow,
    cursor: Option<(f64, f64)>,
) -> Option<String> {
    let (cx, cy) = cursor?;
    let (Ok(origin), Ok(scale)) = (win.inner_position(), win.scale_factor()) else {
        return None;
    };
    let rects = app.state::<HitState>();
    let rects = rects.0.lock().unwrap();
    module_at_point(cx, cy, origin.x as f64, origin.y as f64, scale, &rects).map(str::to_owned)
}

fn module_at_point(
    cx: f64,
    cy: f64,
    origin_x: f64,
    origin_y: f64,
    scale: f64,
    rects: &[HitRect],
) -> Option<&str> {
    rects
        .iter()
        .find(|rect| {
            rect.module_id.is_some()
                && point_in_hit_rects(
                    cx,
                    cy,
                    origin_x,
                    origin_y,
                    scale,
                    std::slice::from_ref(*rect),
                    0.0,
                )
        })
        .and_then(|rect| rect.module_id.as_deref())
}

fn point_in_hit_rects(
    cx: f64,
    cy: f64,
    origin_x: f64,
    origin_y: f64,
    scale: f64,
    rects: &[HitRect],
    margin: f64,
) -> bool {
    rects.iter().any(|r| {
        let left = origin_x + (r.x - margin) * scale;
        let top = origin_y + (r.y - margin).max(0.0) * scale;
        let right = origin_x + (r.x + r.width + margin) * scale;
        let bottom = origin_y + (r.y + r.height + margin) * scale;
        cx >= left && cx <= right && cy >= top && cy <= bottom
    })
}

#[cfg(test)]
mod hit_rect_tests {
    use super::{HitRect, module_at_point, point_in_hit_rects};

    #[test]
    fn toolbar_hit_rect_covers_its_top_and_bottom_at_high_dpi() {
        let toolbar = [HitRect {
            x: 344.0,
            y: 8.0,
            width: 592.0,
            height: 42.0,
            module_id: None,
        }];
        for (origin, scale) in [((1920.0, -1080.0), 1.5), ((3840.0, -2160.0), 2.0)] {
            for y in [origin.1 + 8.0 * scale, origin.1 + 49.0 * scale] {
                assert!(point_in_hit_rects(
                    origin.0 + 640.0 * scale,
                    y,
                    origin.0,
                    origin.1,
                    scale,
                    &toolbar,
                    0.0,
                ));
            }
        }
    }

    #[test]
    fn module_hit_rect_resolves_the_secondary_bubble_target() {
        let bubble = [HitRect {
            x: 784.0,
            y: 0.0,
            width: 50.0,
            height: 50.0,
            module_id: Some("music".into()),
        }];
        let origin = (0.0, 0.0);
        let scale = 1.0;
        assert_eq!(
            module_at_point(809.0, 25.0, origin.0, origin.1, scale, &bubble),
            Some("music")
        );
    }
}

#[cfg(windows)]
fn cursor_pos() -> Option<(f64, f64)> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetPhysicalCursorPos;
    let mut p = POINT::default();
    // Hit rectangles are converted from CSS pixels using the window's DPI
    // scale and compared with physical window positions. GetCursorPos can
    // return thread-logical coordinates; use the physical API so all three
    // values share one coordinate space, including on high-DPI displays.
    unsafe { GetPhysicalCursorPos(&mut p).ok()? };
    Some((p.x as f64, p.y as f64))
}

#[cfg(not(windows))]
fn cursor_pos() -> Option<(f64, f64)> {
    None
}

#[cfg(windows)]
pub(crate) fn foreground_window() -> isize {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    unsafe { GetForegroundWindow().0 as isize }
}

#[cfg(not(windows))]
pub(crate) fn foreground_window() -> isize {
    0
}

/// Check the actual Z order: both Explorer's taskbar and the island can be topmost.
#[cfg(windows)]
fn top_taskbar_above(win: &WebviewWindow) -> bool {
    use windows::Win32::Foundation::{HWND, RECT};
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MONITOR_DEFAULTTONULL, MONITORINFO, MonitorFromWindow,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GW_HWNDPREV, GetClassNameW, GetWindow, GetWindowRect, IsWindowVisible,
    };

    let Ok(hwnd) = win.hwnd() else {
        return false;
    };
    let mut current = HWND(hwnd.0);
    unsafe {
        let monitor = MonitorFromWindow(current, MONITOR_DEFAULTTONULL);
        let mut info = MONITORINFO {
            cbSize: size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if monitor.is_invalid() || !GetMonitorInfoW(monitor, &mut info).as_bool() {
            return false;
        }
        let screen = info.rcMonitor;
        // Bound the walk in case windows are moved or destroyed during the scan.
        for _ in 0..128 {
            let Ok(previous) = GetWindow(current, GW_HWNDPREV) else {
                break;
            };
            current = previous;
            let mut class = [0u16; 32];
            let len = GetClassNameW(current, &mut class) as usize;
            let class = &class[..len];
            let primary = windows::core::w!("Shell_TrayWnd");
            let secondary = windows::core::w!("Shell_SecondaryTrayWnd");
            if class != primary.as_wide() && class != secondary.as_wide() {
                continue;
            }
            let mut bounds = RECT::default();
            if IsWindowVisible(current).as_bool()
                && GetWindowRect(current, &mut bounds).is_ok()
                && bounds.left < screen.right
                && bounds.right > screen.left
                && bounds.top <= screen.top
                && bounds.bottom > screen.top
                && bounds.right - bounds.left > bounds.bottom - bounds.top
            {
                return true;
            }
        }
    }
    false
}

#[cfg(not(windows))]
fn top_taskbar_above(_: &WebviewWindow) -> bool {
    false
}

/// `alwaysOnTop` is only applied once at creation, and Windows can drop the
/// island out of the topmost band afterwards (typically right after boot, when
/// autostart runs before the shell settles): it then sits under whatever app
/// gets focus until the user clicks it. Re-assert it whenever the TOPMOST bit
/// goes missing, and on `force` (foreground change) so another topmost window
/// that just got activated doesn't stay above it.
#[cfg(windows)]
pub(crate) fn ensure_topmost(win: &WebviewWindow, force: bool) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GWL_EXSTYLE, GetWindowLongPtrW, HWND_TOP, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOOWNERZORDER, SWP_NOSIZE,
        SetWindowPos, WS_EX_TOPMOST,
    };

    let Ok(hwnd) = win.hwnd() else {
        return;
    };
    let hwnd = HWND(hwnd.0);
    unsafe {
        let topmost = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) & WS_EX_TOPMOST.0 as isize != 0;
        if topmost && !force {
            return;
        }
        let raised = SetWindowPos(
            hwnd,
            Some(if topmost { HWND_TOP } else { HWND_TOPMOST }),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER,
        );
        if raised.is_ok() && win.label() == ISLAND_LABEL {
            crate::blur::restack(win);
        }
    }
}

#[cfg(not(windows))]
pub(crate) fn ensure_topmost(_: &WebviewWindow, _: bool) {}

/// The island is an overlay, not an app window: it must never look or act
/// like one.
///
/// tao keeps `WS_CAPTION | WS_SYSMENU` on undecorated windows and rewrites
/// the styles on every flag change (each click-through toggle). Tools that
/// draw their own caption buttons on every captioned window (e.g. macOS-style
/// "traffic lights") then put them on the island's full-width strip, right over
/// the minimize/maximize/close buttons of maximized apps. A subclass filters
/// every style change instead: no caption or system menu, and a tool window
/// (also kept out of Alt+Tab). It also keeps Windows from painting a title bar
/// over the strip.
///
/// Nor does it ever become the active window by itself: each of those flag
/// changes ends in `ShowWindow(SW_SHOW)`, which activated the island whenever
/// the pointer crossed it, and so did clicking it. That took the keyboard
/// from the app in use (and made such tools treat the strip as the active
/// window). `WS_EX_NOACTIVATE` keeps clicks from activating it, and position
/// changes lose their activation; only `allow_activation` (typing a question)
/// lets it through. Must run on the window's thread.
#[cfg(windows)]
pub fn make_overlay(win: &WebviewWindow) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Shell::SetWindowSubclass;
    use windows::Win32::UI::WindowsAndMessaging::{
        GWL_EXSTYLE, GWL_STYLE, GetWindowLongW, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER,
        SetWindowLongW, SetWindowPos,
    };

    let Ok(hwnd) = win.hwnd() else {
        return;
    };
    let hwnd = HWND(hwnd.0);
    unsafe {
        if !SetWindowSubclass(hwnd, Some(overlay_proc), OVERLAY_SUBCLASS, 0).as_bool() {
            log::warn!("island: could not subclass the window");
            return;
        }
        // Rewrite the current styles through the filter.
        SetWindowLongW(hwnd, GWL_STYLE, GetWindowLongW(hwnd, GWL_STYLE));
        SetWindowLongW(hwnd, GWL_EXSTYLE, GetWindowLongW(hwnd, GWL_EXSTYLE));
        let _ = SetWindowPos(
            hwnd,
            None,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
        );
    }
}

#[cfg(not(windows))]
pub fn make_overlay(_: &WebviewWindow) {}

#[cfg(windows)]
const OVERLAY_SUBCLASS: usize = 0x15_1A_4D;

#[cfg(windows)]
unsafe extern "system" fn overlay_proc(
    hwnd: windows::Win32::Foundation::HWND,
    msg: u32,
    wparam: windows::Win32::Foundation::WPARAM,
    lparam: windows::Win32::Foundation::LPARAM,
    _id: usize,
    _data: usize,
) -> windows::Win32::Foundation::LRESULT {
    use windows::Win32::Foundation::{LPARAM, LRESULT};
    use windows::Win32::UI::Shell::DefSubclassProc;
    use windows::Win32::UI::WindowsAndMessaging::{
        GWL_EXSTYLE, GWL_STYLE, STYLESTRUCT, SWP_NOACTIVATE, WINDOWPOS, WM_NCACTIVATE, WM_NCPAINT,
        WM_STYLECHANGING, WM_WINDOWPOSCHANGING, WS_CAPTION, WS_EX_APPWINDOW, WS_EX_NOACTIVATE,
        WS_EX_TOOLWINDOW, WS_SYSMENU,
    };

    match msg {
        // There is no frame, but `DefWindowProc` still paints a classic title bar
        // ("Island for Windows" on a dark band) across the whole strip when the window
        // gets activated (dropping on the shelf, typing a question…).
        WM_NCPAINT => return LRESULT(0),
        // Still delivered (tao tracks focus with it); lParam -1 tells
        // `DefWindowProc` not to repaint the non-client area.
        WM_NCACTIVATE => return unsafe { DefSubclassProc(hwnd, msg, wparam, LPARAM(-1)) },
        WM_STYLECHANGING if lparam.0 != 0 => {
            let change = unsafe { &mut *(lparam.0 as *mut STYLESTRUCT) };
            let which = wparam.0 as i32;
            if which == GWL_STYLE.0 {
                change.styleNew &= !(WS_CAPTION.0 | WS_SYSMENU.0);
            } else if which == GWL_EXSTYLE.0 {
                change.styleNew = (change.styleNew | WS_EX_TOOLWINDOW.0) & !WS_EX_APPWINDOW.0;
                if !FILE_DRAG.load(Ordering::Relaxed) {
                    change.styleNew |= WS_EX_NOACTIVATE.0;
                }
            }
        }
        WM_WINDOWPOSCHANGING if lparam.0 != 0 && !activation_allowed() => {
            let pos = unsafe { &mut *(lparam.0 as *mut WINDOWPOS) };
            pos.flags |= SWP_NOACTIVATE;
        }
        _ => {}
    }
    unsafe { DefSubclassProc(hwnd, msg, wparam, lparam) }
}

/// True when a fullscreen app (game, video, F11 browser, presentation) is in
/// front on the island's monitor.
///
/// Two signals:
/// - Windows' own "busy / D3D fullscreen / presentation" state (the one that
///   silences notifications);
/// - the foreground window's rect matching the monitor *exactly*. Maximized
///   windows overhang the screen by their resize borders (~8px) or stop at the
///   taskbar, so they never match — but browsers in fullscreen stay flagged as
///   "maximized", which is why `IsZoomed` can't be used to rule them out.
#[cfg(windows)]
pub(crate) fn fullscreen_app_active(island: &WebviewWindow) -> bool {
    use windows::Win32::Foundation::{HWND, RECT};
    use windows::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST};
    use windows::Win32::UI::Shell::{
        SHQueryUserNotificationState, QUNS_BUSY, QUNS_PRESENTATION_MODE, QUNS_RUNNING_D3D_FULL_SCREEN,
    };
    use windows::Win32::UI::WindowsAndMessaging::{GetClassNameW, GetForegroundWindow, GetWindowRect};

    unsafe {
        let fg = GetForegroundWindow();
        if fg.is_invalid() {
            return false;
        }
        let island_hwnd = island.hwnd().map(|h| h.0).unwrap_or(std::ptr::null_mut());
        if fg.0 == island_hwnd {
            return false;
        }

        // The desktop and shell windows span the whole screen too.
        let mut class = [0u16; 64];
        let len = GetClassNameW(fg, &mut class) as usize;
        let class = String::from_utf16_lossy(&class[..len]);
        if matches!(class.as_str(), "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd") {
            return false;
        }

        let fg_monitor = MonitorFromWindow(fg, MONITOR_DEFAULTTONEAREST);
        let island_monitor = MonitorFromWindow(HWND(island_hwnd), MONITOR_DEFAULTTONEAREST);
        if fg_monitor != island_monitor {
            return false;
        }

        if let Ok(state) = SHQueryUserNotificationState()
            && (state == QUNS_BUSY || state == QUNS_RUNNING_D3D_FULL_SCREEN || state == QUNS_PRESENTATION_MODE) {
                return true;
            }

        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(fg_monitor, &mut info).as_bool() {
            return false;
        }
        let mut rect = RECT::default();
        if GetWindowRect(fg, &mut rect).is_err() {
            return false;
        }
        let m = info.rcMonitor;
        rect.left == m.left && rect.top == m.top && rect.right == m.right && rect.bottom == m.bottom
    }
}

#[cfg(not(windows))]
pub(crate) fn fullscreen_app_active(_: &WebviewWindow) -> bool {
    false
}
