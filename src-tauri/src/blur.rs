use serde::Deserialize;
use tauri::AppHandle;
#[cfg(windows)]
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

pub const BLUR_LABEL: &str = "island-blur";

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

#[cfg(windows)]
pub fn setup(app: &AppHandle) -> tauri::Result<()> {
	use tauri::window::{Effect, EffectsBuilder};

	let blur = WebviewWindowBuilder::new(app, BLUR_LABEL, WebviewUrl::App("blur.html".into()))
		.title("Island backdrop")
		.inner_size(1.0, 1.0)
		.decorations(false)
		.transparent(true)
		.background_color(tauri::webview::Color(0, 0, 0, 0))
		.always_on_top(true)
		.skip_taskbar(true)
		.resizable(false)
		.shadow(false)
		.focused(false)
		.visible(false)
		.effects(EffectsBuilder::new().effect(Effect::Blur).build())
		.build()?;
	blur.set_ignore_cursor_events(true)?;
	Ok(())
}

#[cfg(not(windows))]
pub fn setup(_: &AppHandle) -> tauri::Result<()> {
	Ok(())
}

#[tauri::command]
pub fn set_blur_rect(app: AppHandle, rect: Option<BlurRect>, effect: String) -> Result<(), String> {
	#[cfg(windows)]
	{
		let handle = app.clone();
		app.run_on_main_thread(move || {
			if let Err(error) = update_rect(&handle, rect, &effect) {
				log::warn!("island backdrop: {error}");
				if let Some(blur) = handle.get_webview_window(BLUR_LABEL) {
					let _ = blur.hide();
				}
			}
		})
		.map_err(|e| e.to_string())?;
	}
	#[cfg(not(windows))]
	let _ = (app, rect, effect);
	Ok(())
}

#[cfg(windows)]
fn update_rect(app: &AppHandle, rect: Option<BlurRect>, effect: &str) -> Result<(), String> {
	use windows::Win32::Foundation::HWND;
	use windows::Win32::Graphics::Gdi::{
		CombineRgn, CreateRectRgn, CreateRoundRectRgn, DeleteObject, RGN_OR, SetWindowRgn,
	};
	use windows::Win32::UI::WindowsAndMessaging::{
		SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOOWNERZORDER, SWP_NOSIZE, SWP_SHOWWINDOW, SetWindowPos,
	};

	let Some(blur) = app.get_webview_window(BLUR_LABEL) else {
		return Ok(());
	};
	let Some(rect) = rect.filter(|_| matches!(effect, "subtle" | "moderate" | "ambient")) else {
		blur.hide().map_err(|e| e.to_string())?;
		return Ok(());
	};
	let island = app
		.get_webview_window(crate::window::ISLAND_LABEL)
		.ok_or_else(|| "island window is unavailable".to_string())?;
	let scale = island.scale_factor().map_err(|e| e.to_string())?;
	let origin = island.outer_position().map_err(|e| e.to_string())?;
	// The backdrop must fit inside the shell, including its rounded corners.
	let left = (rect.x * scale).round() as i32 + origin.x;
	let top = (rect.y * scale).round() as i32 + origin.y;
	let width = (rect.width * scale).round().max(1.0) as u32;
	let height = (rect.height * scale).round().max(1.0) as u32;

	let blur_hwnd = blur.hwnd().map_err(|e| e.to_string())?;
	let island_hwnd = island.hwnd().map_err(|e| e.to_string())?;
	let radius_limit = (height / 2).max(1) as f64;
	let radius = (rect.radius * scale).round().clamp(1.0, radius_limit) as i32;
	unsafe {
		// Resize and shape on the same UI thread. Tauri's queued size changes
		// could otherwise run after SetWindowRgn and expose a rectangular frame.
		SetWindowPos(
			HWND(blur_hwnd.0),
			Some(HWND(island_hwnd.0)),
			left,
			top,
			width as i32,
			height as i32,
			SWP_NOACTIVATE | SWP_NOOWNERZORDER,
		)
		.map_err(|e| e.to_string())?;
		let region = CreateRoundRectRgn(0, 0, width as i32 + 1, height as i32 + 1, radius * 2, radius * 2);
		if !rect.rounded_top {
			let top = CreateRectRgn(0, 0, width as i32 + 1, (height as i32 - radius).max(0));
			CombineRgn(Some(region), Some(region), Some(top), RGN_OR);
			let _ = DeleteObject(top.into());
		}
		if SetWindowRgn(HWND(blur_hwnd.0), Some(region), true) == 0 {
			let _ = DeleteObject(region.into());
			return Err("could not shape the blur window".into());
		}
		SetWindowPos(
			HWND(blur_hwnd.0),
			Some(HWND(island_hwnd.0)),
			0,
			0,
			0,
			0,
			SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_SHOWWINDOW,
		)
		.map_err(|e| e.to_string())?;
	}
	Ok(())
}
