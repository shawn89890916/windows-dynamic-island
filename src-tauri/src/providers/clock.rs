//! Read countdowns displayed by Windows Clock. The app doesn't expose a public
//! countdown API, so use Windows OCR on the verified Clock window alone.
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::Manager;
use windows::Media::Ocr::OcrEngine;
use windows::Win32::Foundation::{CloseHandle, HWND, LPARAM, RECT};
use windows::Win32::Storage::Packaging::Appx::GetPackageFamilyName;
use windows::Win32::Storage::Xps::{PRINT_WINDOW_FLAGS, PrintWindow};
use windows::Win32::System::Com::{COINIT_MULTITHREADED, CoInitializeEx};
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumChildWindows, EnumWindows, GetClassNameW, GetWindowRect, GetWindowThreadProcessId,
    IsIconic, IsWindowVisible,
};
use windows::core::{BOOL, PWSTR, w};

use super::{Provider, find::ocr};
use crate::{hub::Hub, screen, settings::Settings};

const ID: &str = "windows-clock";
const ENABLED: &str = "clock.windowsTimer";
const FAMILY: &str = "Microsoft.WindowsAlarms_8wekyb3d8bbwe";
const POLL: Duration = Duration::from_millis(650);
const IDLE_POLL: Duration = Duration::from_secs(2);
const CHANGE_TIMEOUT: Duration = Duration::from_millis(1900);
const RENDER_FULL_CONTENT: PRINT_WINDOW_FLAGS = PRINT_WINDOW_FLAGS(2);

pub(super) struct ClockProvider;

impl Provider for ClockProvider {
    fn id(&self) -> &'static str {
        ID
    }

    fn start(self: Arc<Self>, hub: Arc<Hub>) {
        std::thread::spawn(move || watch(&hub));
    }
}

#[derive(Serialize)]
struct Reading {
    seconds: u32,
}

struct Sample {
    x: f32,
    y: f32,
    seconds: u32,
    changed: Option<Instant>,
}

fn watch(hub: &Hub) {
    if unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) }.is_err() {
        return;
    }
    let settings = hub.app().state::<Settings>();
    let mut engine = None;
    let mut window = None;
    let mut previous: Vec<Sample> = Vec::new();
    loop {
        let enabled = settings
            .get("module.clock.enabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(true)
            && settings
                .get(ENABLED)
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
        if !enabled {
            window = None;
            previous.clear();
            hub.publish(ID, Option::<Reading>::None);
            std::thread::sleep(IDLE_POLL);
            continue;
        }
        let next_window = window
            .filter(|&hwnd| visible(hwnd) && is_clock_window(hwnd))
            .or_else(clock_window);
        if next_window != window {
            previous.clear();
        }
        window = next_window;
        if window.is_some() && engine.is_none() {
            engine = OcrEngine::TryCreateFromUserProfileLanguages().ok();
        }
        let Some((hwnd, engine)) = window.zip(engine.as_ref()) else {
            hub.publish(ID, Option::<Reading>::None);
            std::thread::sleep(IDLE_POLL);
            continue;
        };
        let now = Instant::now();
        let mut samples = sample_window(hwnd, engine).unwrap_or_default();
        for sample in &mut samples {
            let prior = previous.iter().find(|prior| {
                (prior.x - sample.x).abs() < 20.0 && (prior.y - sample.y).abs() < 12.0
            });
            if let Some(prior) = prior {
                // Only countdowns visibly ticking down count. Static presets,
                // paused timers, and a stopwatch counting up don’t match.
                sample.changed = match prior.seconds.checked_sub(sample.seconds) {
                    Some(1..=3) => Some(now),
                    Some(0) => prior
                        .changed
                        .filter(|&at| now.duration_since(at) < CHANGE_TIMEOUT),
                    _ => None,
                };
            }
        }
        let reading = samples
            .iter()
            .filter(|sample| sample.seconds > 0 && sample.changed.is_some())
            .map(|sample| sample.seconds)
            .min()
            .map(|seconds| Reading { seconds });
        hub.publish(ID, reading);
        previous = samples;
        std::thread::sleep(POLL);
    }
}

fn visible(hwnd: HWND) -> bool {
    unsafe { IsWindowVisible(hwnd).as_bool() && !IsIconic(hwnd).as_bool() }
}

fn is_clock_process(hwnd: HWND) -> bool {
    unsafe {
        let mut pid = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        let Ok(process) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
            return false;
        };
        let mut name = [0u16; 128];
        let mut len = name.len() as u32;
        let result = GetPackageFamilyName(process, &mut len, Some(PWSTR(name.as_mut_ptr())));
        let _ = CloseHandle(process);
        result.0 == 0
            && String::from_utf16_lossy(&name[..(len as usize).saturating_sub(1)])
                .eq_ignore_ascii_case(FAMILY)
    }
}

fn is_clock_window(hwnd: HWND) -> bool {
    unsafe extern "system" fn child(hwnd: HWND, data: LPARAM) -> BOOL {
        if is_clock_process(hwnd) {
            unsafe { *(data.0 as *mut bool) = true };
            return false.into();
        }
        true.into()
    }

    if is_clock_process(hwnd) {
        return true;
    }
    let mut class = [0u16; 32];
    let len = unsafe { GetClassNameW(hwnd, &mut class) } as usize;
    let app_frame = w!("ApplicationFrameWindow");
    if &class[..len] != unsafe { app_frame.as_wide() } {
        return false;
    }
    // Older Clock builds host their content under ApplicationFrameHost.
    let mut found = false;
    let _ = unsafe { EnumChildWindows(Some(hwnd), Some(child), LPARAM(&raw mut found as isize)) };
    found
}

fn clock_window() -> Option<HWND> {
    unsafe extern "system" fn visit(hwnd: HWND, data: LPARAM) -> BOOL {
        let found = visible(hwnd) && is_clock_window(hwnd);
        if found {
            unsafe { *(data.0 as *mut Option<HWND>) = Some(hwnd) };
        }
        (!found).into()
    }

    let mut found = None;
    let _ = unsafe { EnumWindows(Some(visit), LPARAM(&raw mut found as isize)) };
    found
}

fn sample_window(hwnd: HWND, engine: &OcrEngine) -> Option<Vec<Sample>> {
    let mut bounds = RECT::default();
    unsafe { GetWindowRect(hwnd, &mut bounds).ok()? };
    let (width, height) = (bounds.right - bounds.left, bounds.bottom - bounds.top);
    let max = OcrEngine::MaxImageDimension().ok()? as i32;
    if width <= 0 || height <= 0 || width > max || height > max {
        return None;
    }
    // No desktop fallback: only pixels provided by the Clock app are read.
    let image = screen::grab(width, height, |dc| {
        unsafe { PrintWindow(hwnd, dc, RENDER_FULL_CONTENT) }.as_bool()
    })?;
    let result = ocr::recognize(engine, &image).ok()?;
    let mut samples = Vec::new();
    for line in result.Lines().ok()? {
        for word in line.Words().ok()? {
            let (Ok(text), Ok(rect)) = (word.Text(), word.BoundingRect()) else {
                continue;
            };
            if rect.Height >= 16.0
                && let Some(seconds) = parse_countdown(&text.to_string_lossy())
            {
                samples.push(Sample {
                    x: rect.X + rect.Width / 2.0,
                    y: rect.Y + rect.Height / 2.0,
                    seconds,
                    changed: None,
                });
            }
        }
    }
    Some(samples)
}

fn parse_countdown(text: &str) -> Option<u32> {
    let mut parts = text.split([':', '：']);
    let mut read = || {
        let part = parts.next()?;
        if part.len() != 2 || !part.bytes().all(|b| b.is_ascii_digit()) {
            return None;
        }
        part.parse::<u32>().ok()
    };
    let (hours, minutes, seconds) = (read()?, read()?, read()?);
    (parts.next().is_none() && minutes < 60 && seconds < 60)
        .then_some(hours * 3600 + minutes * 60 + seconds)
}
