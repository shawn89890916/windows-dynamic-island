//! Clip the GPU backdrop visual, not the HWND: SetWindowRgn breaks DWM alpha.
use serde::Deserialize;
use tauri::AppHandle;
#[cfg(windows)]
mod gaussian;
#[cfg(windows)]
mod native;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlurRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    rounded_top: bool,
    radius: f64,
}

pub fn setup(_: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(windows)]
    native::setup()?;
    Ok(())
}

pub fn hide(app: &AppHandle) {
    #[cfg(windows)]
    let _ = app.run_on_main_thread(native::hide);
    #[cfg(not(windows))]
    let _ = app;
}

#[tauri::command]
pub fn set_blur_rect(app: AppHandle, rect: Option<BlurRect>, effect: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let handle = app.clone();
        app.run_on_main_thread(move || native::update(&handle, rect, &effect))
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))]
    let _ = (app, rect, effect);
    Ok(())
}
