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
const TRAY_RESERVE: f64 = 180.0;
const POLL: Duration = Duration::from_millis(250);

#[derive(Clone, Copy, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Wifi,
    Battery,
}

#[derive(Clone, Copy, Deserialize, PartialEq, Eq, Serialize)]
pub struct LegacyReading {
    kind: Kind,
    percent: Option<u8>,
    connected: bool,
    charging: bool,
}

#[derive(Clone, Copy, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Reading {
    battery_percent: Option<u8>,
    charging: bool,
    wifi_connected: bool,
    wifi_signal_bars: Option<u8>,
    cellular_connected: bool,
    cellular_signal_bars: Option<u8>,
}

#[derive(Clone, Copy, Deserialize, PartialEq, Eq, Serialize)]
#[serde(untagged)]
pub enum TaskbarReading {
    Legacy(LegacyReading),
    Combined(Reading),
}

impl Reading {
    #[cfg(not(windows))]
    fn unavailable() -> Self {
        Self {
            battery_percent: None,
            charging: false,
            wifi_connected: false,
            wifi_signal_bars: None,
            cellular_connected: false,
            cellular_signal_bars: None,
        }
    }
}

#[tauri::command]
pub fn status_ring_read(kind: Kind) -> LegacyReading {
    let reading = read_status();
    match kind {
        Kind::Wifi => LegacyReading {
            kind,
            percent: reading.wifi_signal_bars.map(|bars| bars * 20),
            connected: reading.wifi_connected,
            charging: false,
        },
        Kind::Battery => LegacyReading {
            kind,
            percent: reading.battery_percent,
            connected: reading.battery_percent.is_some(),
            charging: reading.charging,
        },
    }
}

#[tauri::command]
pub fn status_ring_read_all() -> Reading {
    read_status()
}

#[cfg(windows)]
fn read_status() -> Reading {
    use windows::Networking::Connectivity::{
        ConnectionProfile, NetworkConnectivityLevel, NetworkInformation,
    };

    fn connected(profile: &ConnectionProfile) -> bool {
        profile
            .GetNetworkConnectivityLevel()
            .is_ok_and(|level| level != NetworkConnectivityLevel::None)
    }

    fn bars(profile: &ConnectionProfile) -> Option<u8> {
        profile
            .GetSignalBars()
            .ok()
            .and_then(|bars| bars.Value().ok())
            .map(|bars| bars.min(5))
    }

    let profiles = NetworkInformation::GetConnectionProfiles()
        .ok()
        .map(|profiles| {
            let count = profiles.Size().unwrap_or(0);
            (0..count)
                .filter_map(|index| profiles.GetAt(index).ok())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let default_profile = NetworkInformation::GetInternetConnectionProfile().ok();
    let wifi = default_profile
        .iter()
        .chain(profiles.iter())
        .find(|profile| profile.IsWlanConnectionProfile().unwrap_or(false));
    let cellular = profiles
        .iter()
        .find(|profile| profile.IsWwanConnectionProfile().unwrap_or(false));
    let battery = crate::providers::activities::battery::read();
    Reading {
        battery_percent: battery.map(|(_, percent)| percent.min(100)),
        charging: battery.is_some_and(|(charging, _)| charging),
        wifi_connected: wifi.is_some_and(connected),
        wifi_signal_bars: wifi.and_then(bars),
        cellular_connected: cellular.is_some_and(connected),
        cellular_signal_bars: cellular.and_then(bars),
    }
}

#[cfg(not(windows))]
fn read_status() -> Reading {
    Reading::unavailable()
}

#[derive(Default)]
pub struct TaskbarRing {
    reading: Mutex<Option<TaskbarReading>>,
    changed: Condvar,
}

#[tauri::command]
pub fn status_ring_taskbar(state: State<'_, TaskbarRing>) -> Option<TaskbarReading> {
    *state.reading.lock().unwrap()
}

#[tauri::command]
pub fn status_ring_set_taskbar(
    window: WebviewWindow,
    state: State<'_, TaskbarRing>,
    mut reading: Option<LegacyReading>,
) {
    if window.label() != crate::window::ISLAND_LABEL {
        return;
    }
    if let Some(reading) = reading.as_mut()
        && let Some(percent) = reading.percent.as_mut()
    {
        *percent = (*percent).min(100);
    }
    update_taskbar_reading(&state, reading.map(TaskbarReading::Legacy));
}

#[tauri::command]
pub fn status_ring_set_taskbar_all(
    window: WebviewWindow,
    state: State<'_, TaskbarRing>,
    mut reading: Option<Reading>,
) {
    if window.label() != crate::window::ISLAND_LABEL {
        return;
    }
    if let Some(reading) = reading.as_mut()
        && let Some(percent) = reading.battery_percent.as_mut()
    {
        *percent = (*percent).min(100);
    }
    if let Some(reading) = reading.as_mut()
        && let Some(bars) = reading.wifi_signal_bars.as_mut()
    {
        *bars = (*bars).min(5);
    }
    if let Some(reading) = reading.as_mut()
        && let Some(bars) = reading.cellular_signal_bars.as_mut()
    {
        *bars = (*bars).min(5);
    }
    update_taskbar_reading(&state, reading.map(TaskbarReading::Combined));
}

fn update_taskbar_reading(state: &TaskbarRing, reading: Option<TaskbarReading>) {
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
    Ok(win)
}

#[tauri::command]
pub fn status_ring_open_island(window: WebviewWindow, app: AppHandle) {
    if window.label() != LABEL {
        return;
    }
    let _ = app.emit_to(
        crate::window::ISLAND_LABEL,
        "island://toggle-module",
        "com.island.status-ring",
    );
}

/// Align the compact ring within the taskbar band on the island's monitor.
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
    let left = bounds.x;
    let top = bounds.y;
    let right = left + full.width as i32;
    let bottom = top + full.height as i32;
    let work_left = work.position.x;
    let work_top = work.position.y;
    let work_right = work_left + work.size.width as i32;
    let work_bottom = work_top + work.size.height as i32;
    let side = size as i32;
    let tray_reserve = (TRAY_RESERVE * scale).round() as i32;
    if full.width < size || full.height < size {
        return Ok(false);
    }
    let (x, y) = if work_bottom < bottom {
        (
            (work_right - side - gap - tray_reserve).max(left),
            work_bottom + ((bottom - work_bottom - side) / 2),
        )
    } else if work_top > top {
        (
            (work_right - side - gap - tray_reserve).max(left),
            top + ((work_top - top - side) / 2),
        )
    } else if work_left > left {
        (
            left + ((work_left - left - side) / 2),
            (work_bottom - side - gap - tray_reserve).max(top),
        )
    } else if work_right < right {
        (
            work_right + ((right - work_right - side) / 2),
            (work_bottom - side - gap - tray_reserve).max(top),
        )
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
