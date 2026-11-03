use serde::Deserialize;
use tauri::AppHandle;
#[cfg(windows)]
use tauri::{Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

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
		use windows::Win32::Foundation::HWND;
		use windows::Win32::Graphics::Gdi::{
			CombineRgn, CreateRectRgn, CreateRoundRectRgn, DeleteObject, RGN_OR, SetWindowRgn,
		};
		use windows::Win32::UI::WindowsAndMessaging::{
			SetWindowPos, SWP_NOACTIVATE, SWP_NOOWNERZORDER, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
		};

		let Some(blur) = app.get_webview_window(BLUR_LABEL) else {
			return Ok(());
		};
		let Some(rect) = rect.filter(|_| matches!(effect.as_str(), "subtle" | "moderate" | "ambient")) else {
			blur.hide().map_err(|e| e.to_string())?;
			return Ok(());
		};
		let island = app
			.get_webview_window(crate::window::ISLAND_LABEL)
			.ok_or_else(|| "island window is unavailable".to_string())?;
		let scale = island.scale_factor().map_err(|e| e.to_string())?;
		let origin = island.outer_position().map_err(|e| e.to_string())?;
		let pad = match effect.as_str() {
			"moderate" => 8.0,
			"ambient" => 16.0,
			_ => 0.0,
		};
		let left = ((rect.x - pad) * scale).round() as i32 + origin.x;
		let top = ((rect.y - pad) * scale).round() as i32 + origin.y;
		let width = ((rect.width + pad * 2.0) * scale).round().max(1.0) as u32;
		let height = ((rect.height + pad * 2.0) * scale).round().max(1.0) as u32;
		blur
			.set_position(PhysicalPosition::new(left, top))
			.map_err(|e| e.to_string())?;
		blur
			.set_size(PhysicalSize::new(width, height))
			.map_err(|e| e.to_string())?;

		let blur_hwnd = blur.hwnd().map_err(|e| e.to_string())?;
		let island_hwnd = island.hwnd().map_err(|e| e.to_string())?;
		let radius_limit = (height / 2).max(1) as f64;
		let radius = (rect.radius * scale).round().clamp(1.0, radius_limit) as i32;
		unsafe {
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
	}
	#[cfg(not(windows))]
	let _ = (app, rect, effect);
	Ok(())
}
