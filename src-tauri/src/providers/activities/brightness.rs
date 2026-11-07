//! Brightness OSD: show a level alert when Windows reports a change to an
//! internal display's brightness through WMI.

use std::time::{Duration, Instant};

use tauri::Manager;
use windows::Win32::System::Com::{
    CLSCTX_ALL, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx, CoSetProxyBlanket,
    EOAC_NONE, RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE,
};
use windows::Win32::System::Rpc::{RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE};
use windows::Win32::System::Variant::VARIANT;
use windows::Win32::System::Wmi::{
    IEnumWbemClassObject, IWbemContext, IWbemLocator, IWbemServices, WBEM_FLAG_FORWARD_ONLY,
    WBEM_FLAG_RETURN_IMMEDIATELY, WbemLocator,
};
use windows::core::{BSTR, PCWSTR, w};

use super::{Activities, Activity, Style};
use crate::i18n;
use crate::settings::Settings;

const POLL: Duration = Duration::from_millis(300);
const RETRY: Duration = Duration::from_secs(5);
const SHOW_FOR: Duration = Duration::from_millis(1600);

pub fn watch(activities: Activities) {
    if unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) }.is_err() {
        log::warn!("brightness: COM initialization failed");
        return;
    }

    let mut services: Option<IWbemServices> = None;
    let mut retry_at = Instant::now();
    let mut last = None;

    loop {
        if !mac_appearance_enabled(activities.app()) {
            last = None;
            std::thread::sleep(Duration::from_secs(1));
            continue;
        }

        if services.is_none() && Instant::now() >= retry_at {
            services = connect();
            if services.is_none() {
                retry_at = Instant::now() + RETRY;
            }
        }

		if let Some(service) = &services {
			match read(service) {
                Ok(Some(level)) => {
                    if last.is_some_and(|previous: u8| previous.abs_diff(level) >= 1) {
                        show(&activities, level);
                    }
                    last = Some(level);
                }
                Ok(None) => {}
                Err(error) => {
                    log::debug!("brightness: WMI read failed: {error}");
                    services = None;
                    retry_at = Instant::now() + RETRY;
                    last = None;
                }
            }
        }

        std::thread::sleep(POLL);
    }
}

fn mac_appearance_enabled(app: &tauri::AppHandle) -> bool {
    app.state::<Settings>()
        .get("plugins.installed")
        .and_then(|value| value.as_array().cloned())
        .is_some_and(|plugins| {
            plugins.iter().any(|plugin| {
                plugin["enabled"] == true
                    && plugin["packageSha256"].as_str().is_some()
                    && plugin["manifest"]["appearance"] == "mac-compact"
            })
        })
}

fn connect() -> Option<IWbemServices> {
    let result = unsafe {
        let locator: IWbemLocator =
            CoCreateInstance::<_, IWbemLocator>(&WbemLocator, None, CLSCTX_ALL).ok()?;
        let services = locator
            .ConnectServer(
                &BSTR::from("ROOT\\WMI"),
                &BSTR::new(),
                &BSTR::new(),
                &BSTR::new(),
                0,
                &BSTR::new(),
                None::<&IWbemContext>,
            )
            .ok()?;
        CoSetProxyBlanket(
            &services,
            RPC_C_AUTHN_WINNT,
            RPC_C_AUTHZ_NONE,
			PCWSTR::null(),
            RPC_C_AUTHN_LEVEL_CALL,
            RPC_C_IMP_LEVEL_IMPERSONATE,
            None,
            EOAC_NONE,
        )
        .ok()?;
        Some(services)
    };
    if result.is_none() {
        log::debug!("brightness: Windows WMI brightness source is unavailable");
    }
    result
}

fn read(services: &IWbemServices) -> windows::core::Result<Option<u8>> {
    let enumerator: IEnumWbemClassObject = unsafe {
        services.ExecQuery(
            &BSTR::from("WQL"),
            &BSTR::from("SELECT CurrentBrightness FROM WmiMonitorBrightness"),
            WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY,
            None::<&IWbemContext>,
        )?
    };
    let mut objects = [None];
    let mut count = 0u32;
    let _ = unsafe { enumerator.Next(1_000, &mut objects, &mut count) };
    if count == 0 {
        return Ok(None);
    }
    let mut value = VARIANT::default();
    unsafe {
        objects[0]
            .as_ref()
            .unwrap()
            .Get(w!("CurrentBrightness"), 0, &mut value, None, None)?
    };
	Ok(u16::try_from(&value).ok().map(to_percent))
}

fn to_percent(level: u16) -> u8 {
	level.min(100) as u8
}

fn show(activities: &Activities, level: u8) {
    let app = activities.app();
    let mut alert = Activity::alert("system.brightness", "brightness", SHOW_FOR);
    alert.title = i18n::t(app, "system.brightness.title");
    alert.icon = Some("sun".into());
    alert.progress = Some(level as f64 / 100.0);
    alert.priority = 100;
    alert.style = Style::Level;
    activities.upsert(alert);
}

#[cfg(test)]
mod tests {
	use super::to_percent;

	#[test]
	fn brightness_levels_stay_within_percent_range() {
		assert_eq!(to_percent(0), 0);
		assert_eq!(to_percent(73), 73);
		assert_eq!(to_percent(255), 100);
	}
}
