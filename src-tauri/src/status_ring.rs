//! Native data and the optional, non-activating taskbar status ring.
use std::sync::{Condvar, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

const LABEL: &str = "status-ring";
const SIZE: f64 = 40.0;
const POLL: Duration = Duration::from_millis(250);

#[derive(Clone, Copy, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Wifi,
    Battery,
}

#[derive(Clone, Copy, Deserialize, PartialEq, Eq, Serialize)]
pub struct Reading {
    kind: Kind,
    percent: Option<u8>,
    connected: bool,
    charging: bool,
}

impl Reading {
    fn unavailable(kind: Kind) -> Self {
        Self {
            kind,
            percent: None,
            connected: false,
            charging: false,
        }
    }
}

#[tauri::command]
pub fn status_ring_read(kind: Kind) -> Reading {
    match kind {
        Kind::Wifi => read_wifi(),
        Kind::Battery => read_battery(),
    }
}

#[cfg(windows)]
fn read_wifi() -> Reading {
    use windows::Networking::Connectivity::{
        ConnectionProfile, NetworkConnectivityLevel, NetworkInformation,
    };

    fn wifi(profile: &ConnectionProfile) -> bool {
        profile.IsWlanConnectionProfile().unwrap_or(false)
            && profile
                .GetNetworkConnectivityLevel()
                .is_ok_and(|level| level != NetworkConnectivityLevel::None)
    }

    let profile = NetworkInformation::GetInternetConnectionProfile()
        .ok()
        .filter(wifi)
        .or_else(|| {
            let profiles = NetworkInformation::GetConnectionProfiles().ok()?;
            let count = profiles.Size().ok()?;
            (0..count).filter_map(|i| profiles.GetAt(i).ok()).find(wifi)
        });
    let Some(profile) = profile else {
        return Reading::unavailable(Kind::Wifi);
    };

    // WinRT exposes the same 0–5 bars as the system indicator.
    let percent = profile
        .GetSignalBars()
        .ok()
        .and_then(|bars| bars.Value().ok())
        .map(|bars| bars.min(5) * 20);
    Reading {
        kind: Kind::Wifi,
        percent,
        connected: true,
        charging: false,
    }
}

#[cfg(windows)]
fn read_battery() -> Reading {
    let Some((charging, percent)) = crate::providers::activities::battery::read() else {
        return Reading::unavailable(Kind::Battery);
    };
    Reading {
        kind: Kind::Battery,
        percent: Some(percent),
        connected: true,
        charging,
    }
}

#[cfg(not(windows))]
fn read_wifi() -> Reading {
    Reading::unavailable(Kind::Wifi)
}

#[cfg(not(windows))]
fn read_battery() -> Reading {
    Reading::unavailable(Kind::Battery)
}

#[derive(Default)]
pub struct TaskbarRing {
    reading: Mutex<Option<Reading>>,
    changed: Condvar,
}

#[tauri::command]
pub fn status_ring_taskbar(state: State<'_, TaskbarRing>) -> Option<Reading> {
    *state.reading.lock().unwrap()
}

#[tauri::command]
pub fn status_ring_set_taskbar(
    window: WebviewWindow,
    state: State<'_, TaskbarRing>,
    mut reading: Option<Reading>,
) {
    if window.label() != crate::window::ISLAND_LABEL {
        return;
    }
    if let Some(percent) = reading
        .as_mut()
        .and_then(|reading| reading.percent.as_mut())
    {
        *percent = (*percent).min(100);
    }
    let mut current = state.reading.lock().unwrap();
    if *current != reading {
        *current = reading;
        state.changed.notify_one();
    }
}

pub fn spawn(app: AppHandle) {
    std::thread::spawn(move || {
        let state = app.state::<TaskbarRing>();
        let mut last = None;
        let mut foreground = 0;
        let mut visible = false;
        loop {
            let reading = *state.reading.lock().unwrap();
            if reading.is_none() {
                if let Some(win) = app.get_webview_window(LABEL) {
                    let _ = win.destroy();
                }
                last = None;
                visible = false;
                let current = state.reading.lock().unwrap();
                drop(
                    state
                        .changed
                        .wait_while(current, |reading| reading.is_none())
                        .unwrap(),
                );
                continue;
            }

            let win = match app
                .get_webview_window(LABEL)
                .map_or_else(|| create(&app), Ok)
            {
                Ok(win) => win,
                Err(error) => {
                    log::warn!("status ring window: {error}");
                    std::thread::sleep(Duration::from_secs(3));
                    continue;
                }
            };
            let Some(island) = app.get_webview_window(crate::window::ISLAND_LABEL) else {
                let _ = win.hide();
                std::thread::sleep(Duration::from_secs(1));
                continue;
            };
            if reading != last {
                let _ = app.emit_to(LABEL, "status-ring://changed", reading);
                last = reading;
            }

            let placed = place(&win, &island).unwrap_or(false);
            let show = placed && !crate::window::fullscreen_app_active(&island);
            let fg = crate::window::foreground_window();
            if show != visible {
                let result = if show { win.show() } else { win.hide() };
                if result.is_ok() {
                    crate::window::ensure_topmost(&win, show);
                    visible = show;
                }
            }
            if visible {
                crate::window::ensure_topmost(&win, fg != foreground);
            }
            foreground = fg;
            let current = state.reading.lock().unwrap();
            drop(
                state
                    .changed
                    .wait_timeout_while(current, POLL, |current| *current == reading)
                    .unwrap(),
            );
        }
    });
}

fn create(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let win = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("index.html".into()))
        .title("Island for Windows — Status Ring")
        .inner_size(SIZE, SIZE)
        .transparent(true)
        .decorations(false)
        .shadow(false)
        .resizable(false)
        .focusable(false)
        .focused(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(false)
        .build()?;
    win.set_ignore_cursor_events(true)?;
    Ok(win)
}

/// Place beside the taskbar on the island's monitor, using its reserved edge.
fn place(win: &WebviewWindow, island: &WebviewWindow) -> tauri::Result<bool> {
    let monitor = island.current_monitor()?.or(island.primary_monitor()?);
    let Some(monitor) = monitor else {
        return Ok(false);
    };
    let work = monitor.work_area();
    let bounds = monitor.position();
    let full = monitor.size();
    let scale = monitor.scale_factor();
    let size = (SIZE * scale).round() as u32;
    let gap = (8.0 * scale).round() as i32;
    let left = work.position.x;
    let top = work.position.y;
    let right = left + work.size.width as i32;
    let bottom = top + work.size.height as i32;
    let side = size as i32;
    if work.size.width < size || work.size.height < size {
        return Ok(false);
    }
    let (x, y) = if bottom < bounds.y + full.height as i32 {
        (right - side - gap, bottom - side - gap)
    } else if top > bounds.y {
        (right - side - gap, top + gap)
    } else if left > bounds.x {
        (left + gap, bottom - side - gap)
    } else {
        (right - side - gap, bottom - side - gap)
    };
    let pos = PhysicalPosition::new(x.clamp(left, right - side), y.clamp(top, bottom - side));
    if win.outer_position()? != pos {
        win.set_position(pos)?;
    }
    if win.inner_size()? != PhysicalSize::new(size, size) {
        win.set_size(PhysicalSize::new(size, size))?;
    }
    Ok(true)
}
