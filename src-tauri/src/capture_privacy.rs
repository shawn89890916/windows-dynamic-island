use crate::settings::Settings;

#[tauri::command]
pub fn capture_privacy() -> &'static str {
    #[cfg(windows)]
    {
        use windows_registry::CURRENT_USER;

        const CONSENT_STORE: &str =
            r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore";
        if let Ok(consent) = CURRENT_USER.open(CONSENT_STORE) {
            if capability_in_use(&consent, "webcam") {
                return "camera";
            }
            if capability_in_use(&consent, "microphone") {
                return "microphone";
            }
        }
    }
    "idle"
}

#[cfg(windows)]
fn capability_in_use(consent: &windows_registry::Key, capability: &str) -> bool {
    let Ok(key) = consent.open(capability) else {
        return false;
    };
    // Desktop app records are under NonPackaged. Packaged app records are
    // immediate children of the capability. Only read usage timestamps.
    apps_in_use(&key) || key.open("NonPackaged").is_ok_and(|desktop| apps_in_use(&desktop))
}

#[cfg(windows)]
fn apps_in_use(apps: &windows_registry::Key) -> bool {
    apps.keys().is_ok_and(|keys| {
        keys.filter_map(|name| apps.open(name).ok()).any(|app| {
            session_is_live(
                app.get_u64("LastUsedTimeStart").ok(),
                app.get_u64("LastUsedTimeStop").ok(),
            )
        })
    })
}

#[cfg(windows)]
fn session_is_live(start: Option<u64>, stop: Option<u64>) -> bool {
    start.is_some_and(|start| start > 0 && stop.is_none_or(|stop| stop < start))
}

pub fn mac_appearance_enabled(settings: &Settings) -> bool {
    settings
        .get("plugins.installed")
        .and_then(|value| value.as_array().cloned())
        .is_some_and(|plugins| {
            plugins.iter().any(|plugin| {
                plugin["enabled"] == true
                    && plugin["packageSha256"].as_str().is_some_and(|sha| !sha.is_empty())
                    && plugin["manifest"]["appearance"] == "mac-compact"
            })
        })
}

#[cfg(all(test, windows))]
mod tests {
    use super::session_is_live;

    #[test]
    fn a_session_is_live_until_its_stop_time_reaches_its_start_time() {
        assert!(session_is_live(Some(100), Some(0)));
        assert!(session_is_live(Some(200), Some(100)));
        assert!(session_is_live(Some(100), None));
        assert!(!session_is_live(None, Some(0)));
        assert!(!session_is_live(Some(0), Some(0)));
        assert!(!session_is_live(Some(100), Some(200)));
        assert!(!session_is_live(Some(100), Some(100)));
    }
}
