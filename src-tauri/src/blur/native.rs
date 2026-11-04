use super::{BlurRect, gaussian::Gaussian};
use std::{cell::RefCell, ffi::c_void};
use tauri::{AppHandle, Manager};
use windows::{
    Graphics::Effects::IGraphicsEffect,
    System::{DispatcherQueue, DispatcherQueueController},
    UI::Composition::{
        CompositionBorderMode, CompositionEffectSourceParameter,
        CompositionRoundedRectangleGeometry, Compositor, ContainerVisual,
        Desktop::DesktopWindowTarget, SpriteVisual,
    },
    Win32::{
        Foundation::{HWND, LPARAM, LRESULT, WPARAM},
        System::{
            LibraryLoader::{GetModuleHandleW, GetProcAddress},
            WinRT::{
                Composition::ICompositorDesktopInterop, CreateDispatcherQueueController,
                DQTAT_COM_STA, DQTYPE_THREAD_CURRENT, DispatcherQueueOptions,
            },
        },
        UI::WindowsAndMessaging::*,
    },
    core::{BOOL, Interface, Result, s, w},
};
use windows_numerics::Vector2;

thread_local! {
    static BACKDROP: RefCell<Option<Backdrop>> = const { RefCell::new(None) };
}

struct Backdrop {
    hwnd: HWND,
    compositor: Compositor,
    _queue: Option<DispatcherQueueController>,
    _target: DesktopWindowTarget,
    _root: ContainerVisual,
    visual: SpriteVisual,
    top: SpriteVisual,
    geometry: CompositionRoundedRectangleGeometry,
    amount: f32,
}

pub fn setup() -> Result<()> {
    let backdrop = Backdrop::new()?;
    BACKDROP.with(|slot| *slot.borrow_mut() = Some(backdrop));
    Ok(())
}

pub fn hide() {
    BACKDROP.with(|slot| {
        if let Some(backdrop) = slot.borrow().as_ref() {
            backdrop.hide();
        }
    });
}

pub fn update(app: &AppHandle, rect: Option<BlurRect>, effect: &str) {
    BACKDROP.with(|slot| {
        let mut slot = slot.borrow_mut();
        let Some(backdrop) = slot.as_mut() else {
            return;
        };
        // Ignore queued animation frames while Settings owns the foreground.
        if crate::settings::is_open() {
            backdrop.hide();
            return;
        }
        let sigma = match effect {
            "subtle" => 6.0,
            "moderate" => 12.0,
            "ambient" => 20.0,
            _ => 0.0,
        };
        let Some(rect) = rect.filter(|_| sigma > 0.0) else {
            backdrop.hide();
            return;
        };
        if let Err(error) = backdrop.update(app, rect, sigma) {
            backdrop.hide();
            log::warn!("desktop backdrop: {error}");
        }
    });
}

impl Backdrop {
    fn new() -> Result<Self> {
        unsafe {
            let queue = if DispatcherQueue::GetForCurrentThread().is_ok() {
                None
            } else {
                Some(CreateDispatcherQueueController(DispatcherQueueOptions {
                    dwSize: std::mem::size_of::<DispatcherQueueOptions>() as u32,
                    threadType: DQTYPE_THREAD_CURRENT,
                    apartmentType: DQTAT_COM_STA,
                })?)
            };
            let instance = GetModuleHandleW(None)?;
            let class = w!("IslandCompositionBackdrop");
            RegisterClassW(&WNDCLASSW {
                lpfnWndProc: Some(window_proc),
                hInstance: instance.into(),
                lpszClassName: class,
                ..Default::default()
            });
            let hwnd = CreateWindowExW(
                WS_EX_NOREDIRECTIONBITMAP | WS_EX_TRANSPARENT | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW,
                class,
                w!("Island backdrop"),
                WS_POPUP,
                0,
                0,
                1,
                1,
                None,
                None,
                Some(instance.into()),
                None,
            )?;
            // Host-backdrop mode exposes the desktop to CreateBackdropBrush.
            // CreateHostBackdropBrush returned opaque black on the affected PC.
            #[repr(C)]
            struct Policy {
                state: u32,
                flags: u32,
                color: u32,
                animation: u32,
            }
            #[repr(C)]
            struct Attribute {
                id: u32,
                data: *mut c_void,
                size: usize,
            }
            let mut policy = Policy {
                state: 5,
                flags: 0,
                color: 0,
                animation: 0,
            };
            let attribute = Attribute {
                id: 19,
                data: (&mut policy as *mut Policy).cast(),
                size: std::mem::size_of::<Policy>(),
            };
            let symbol = GetProcAddress(
                GetModuleHandleW(w!("user32.dll"))?,
                s!("SetWindowCompositionAttribute"),
            )
            .ok_or_else(windows::core::Error::from_thread)?;
            let set: unsafe extern "system" fn(HWND, *const Attribute) -> BOOL =
                std::mem::transmute(symbol);
            set(hwnd, &attribute).ok()?;
            let compositor = Compositor::new()?;
            let interop: ICompositorDesktopInterop = compositor.cast()?;
            let target = interop.CreateDesktopWindowTarget(hwnd, false)?;
            let root = compositor.CreateContainerVisual()?;
            let visual = compositor.CreateSpriteVisual()?;
            let top = compositor.CreateSpriteVisual()?;
            let geometry = compositor.CreateRoundedRectangleGeometry()?;
            visual.SetClip(&compositor.CreateGeometricClipWithGeometry(&geometry)?)?;
            visual.SetBorderMode(CompositionBorderMode::Soft)?;
            root.Children()?.InsertAtTop(&visual)?;
            root.Children()?.InsertAtTop(&top)?;
            target.SetRoot(&root)?;
            Ok(Self {
                hwnd,
                compositor,
                _queue: queue,
                _target: target,
                _root: root,
                visual,
                top,
                geometry,
                amount: -1.0,
            })
        }
    }

    fn hide(&self) {
        unsafe {
            let _ = ShowWindow(self.hwnd, SW_HIDE);
        }
    }

    fn update(&mut self, app: &AppHandle, rect: BlurRect, sigma: f32) -> Result<()> {
        let Some(island) = app.get_webview_window(crate::window::ISLAND_LABEL) else {
            self.hide();
            return Ok(());
        };
        let scale = island.scale_factor().unwrap_or(1.0);
        let origin = island.outer_position().unwrap_or_default();
        let width = (rect.width * scale).round().max(1.0) as f32;
        let height = (rect.height * scale).round().max(1.0) as f32;
        let radius = (rect.radius * scale).clamp(0.0, f64::from(height.min(width)) / 2.0) as f32;
        let amount = sigma * scale as f32;
        if self.amount != amount {
            let source = CompositionEffectSourceParameter::Create(&"Backdrop".into())?;
            let effect: IGraphicsEffect = Gaussian {
                source: source.cast()?,
                amount,
            }
            .into();
            let brush = self
                .compositor
                .CreateEffectFactory(&effect)?
                .CreateBrush()?;
            brush
                .SetSourceParameter(&"Backdrop".into(), &self.compositor.CreateBackdropBrush()?)?;
            self.visual.SetBrush(&brush)?;
            self.top.SetBrush(&brush)?;
            self.amount = amount;
        }
        self.visual.SetSize(Vector2 {
            X: width,
            Y: height,
        })?;
        self.geometry.SetSize(Vector2 {
            X: width,
            Y: height,
        })?;
        self.geometry.SetCornerRadius(Vector2 {
            X: radius,
            Y: radius,
        })?;
        // Fill the top corners only in the screen-attached notch style.
        self.top.SetSize(Vector2 {
            X: width,
            Y: if rect.rounded_top {
                0.0
            } else {
                (height - radius).max(0.0)
            },
        })?;
        let hwnd = island.hwnd().map_err(|e| {
            windows::core::Error::new(windows::core::HRESULT(0x80004005u32 as i32), e.to_string())
        })?;
        unsafe {
            SetWindowPos(
                self.hwnd,
                Some(HWND(hwnd.0)),
                origin.x + (rect.x * scale).round() as i32,
                origin.y + (rect.y * scale).round() as i32,
                width as i32,
                height as i32,
                SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_SHOWWINDOW,
            )?;
        }
        Ok(())
    }
}

unsafe extern "system" fn window_proc(
    hwnd: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match message {
        WM_NCHITTEST => LRESULT(-1), // Always pass pointer input to the island above.
        WM_MOUSEACTIVATE => LRESULT(MA_NOACTIVATE as isize),
        _ => unsafe { DefWindowProcW(hwnd, message, wparam, lparam) },
    }
}
