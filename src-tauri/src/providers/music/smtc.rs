//! Now-playing metadata and transport controls through SMTC.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use base64::Engine;
use serde_json::Value;
use tauri::Manager;
use windows::ApplicationModel::AppInfo;
use windows::Foundation::Size;
use windows::core::{HSTRING, Result};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession as Session,
    GlobalSystemMediaTransportControlsSessionManager as SessionManager,
    GlobalSystemMediaTransportControlsSessionMediaProperties as MediaProperties,
    GlobalSystemMediaTransportControlsSessionPlaybackInfo as PlaybackInfo,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
};
use windows::Storage::Streams::{DataReader, RandomAccessStreamReference};

use super::spotify::{self, Spotify};
use super::{MusicState, ID};
use crate::hub::Hub;
use crate::providers::{now_ms, process};
use crate::settings::Settings;

/// Off by default: the YouTube lookup is a search request per browser track.
const VIDEO_KEY: &str = "music.video.label";

/// 100ns ticks between 1601-01-01 and 1970-01-01.
const EPOCH_DIFF_TICKS: i64 = 116_444_736_000_000_000;

pub fn poll_loop(hub: Arc<Hub>, playing_flag: Arc<AtomicBool>, spotify: Arc<Spotify>) {
    let mut manager: Option<SessionManager> = None;
    let mut track_key = String::new();
    let mut thumbnail: Option<String> = None;
    let mut thumb_attempts = 0u8;
    let mut thumb_retry_at = Instant::now();
    let mut packaged_icons = HashMap::new();
    let youtube = super::youtube::Resolver::default();
    let mut clock = super::timeline::TimelineClock::default();

    loop {
        if manager.is_none() {
            manager = SessionManager::RequestAsync().and_then(|op| op.join()).ok();
        }
        let state = match manager.as_ref().map(|manager| read_state(manager, &mut clock)) {
            Some(Ok(Some((mut state, properties)))) => {
                let key = format!("{}|{}|{}|{}", state.app_id, state.title, state.artist, state.album);
                if key != track_key {
                    track_key = key;
                    thumbnail = None;
                    thumb_attempts = 0;
                    thumb_retry_at = Instant::now();
                }
                // Players often publish artwork a moment after the metadata.
                if thumbnail.is_none() && Instant::now() >= thumb_retry_at {
                    thumbnail = properties.Thumbnail().ok().and_then(|reference| read_image(&reference));
                    thumb_attempts = thumb_attempts.saturating_add(1);
                    if thumb_attempts >= 6 {
                        thumb_retry_at = Instant::now() + Duration::from_secs(5);
                    }
                }
                state.thumbnail = thumbnail.clone();
                let video = hub.app().state::<Settings>().get(VIDEO_KEY).and_then(|v| v.as_bool()).unwrap_or(false);
                if video {
                    state.youtube_id = youtube.video_id(&state);
                }
                state.volume = super::volume::system();
                let local = super::volume::app(&state.app_id);
                spotify.set_wanted(local.is_none() && spotify::is_spotify(&state.app_id));
                if let Some((volume, exe)) = local {
                    state.app_volume = Some(volume);
                    state.app_icon = process::app_icon(&exe);
                } else if spotify::is_spotify(&state.app_id)
                    && let Some((volume, device)) = spotify.volume()
                {
                    state.app_volume = Some(volume);
                    state.app_device = Some(device);
                    // The desktop app still runs here, just silent: its icon.
                    state.app_icon = process::find_exe("spotify").and_then(|exe| process::app_icon(&exe));
                }
                if state.app_icon.is_none() && state.app_id.contains('!') {
                    state.app_icon = packaged_icons
                        .entry(state.app_id.clone())
                        .or_insert_with(|| packaged_icon(&state.app_id))
                        .clone();
                }
                state
            }
            Some(Ok(None)) => MusicState::default(),
            Some(Err(_)) | None => {
                manager = None;
                MusicState::default()
            }
        };
        if !state.available {
            clock.reset();
            spotify.set_wanted(false);
            track_key.clear();
        }
        playing_flag.store(state.playing, Ordering::Relaxed);
        hub.publish(ID, &state);
        std::thread::sleep(Duration::from_millis(if state.playing { 500 } else { 1000 }));
    }
}

pub fn control(action: &str, payload: Value) -> Result<()> {
    let manager = SessionManager::RequestAsync()?.join()?;
    let Some((track, _)) = pick_session(&manager)? else {
        return Ok(());
    };
    let session = track.session;
    match action {
        "toggle" => session.TryTogglePlayPauseAsync()?.join()?,
        "play" => session.TryPlayAsync()?.join()?,
        "pause" => session.TryPauseAsync()?.join()?,
        "next" => session.TrySkipNextAsync()?.join()?,
        "previous" => session.TrySkipPreviousAsync()?.join()?,
        "focus" => {
            super::focus::focus(&session.SourceAppUserModelId()?.to_string(), &track.title);
            true
        }
        "seek" => {
            let ms = payload.as_u64().unwrap_or(0) as i64;
            session.TryChangePlaybackPositionAsync(ms * 10_000)?.join()?
        }
        _ => false,
    };
    Ok(())
}

struct Track {
    session: Session,
    properties: MediaProperties,
    info: PlaybackInfo,
    title: String,
}

fn pick_session(manager: &SessionManager) -> Result<Option<(Track, bool)>> {
    super::session::select_track(
        manager.GetCurrentSession().ok(),
        || manager.GetSessions(),
        |session, playing_only| read_track(session, playing_only).ok().flatten(),
    )
}

fn read_track(session: &Session, playing_only: bool) -> Result<Option<(Track, bool)>> {
    let info = session.GetPlaybackInfo()?;
    let playing = info.PlaybackStatus()? == Status::Playing;
    if playing_only && !playing {
        return Ok(None);
    }
    let properties = session.TryGetMediaPropertiesAsync()?.join()?;
    let title = properties.Title()?.to_string();
    if title.trim().is_empty() {
        return Ok(None);
    }
    Ok(Some((
        Track {
            session: session.clone(),
            properties,
            info,
            title,
        },
        playing,
    )))
}

fn read_state(
    manager: &SessionManager,
    clock: &mut super::timeline::TimelineClock,
) -> Result<Option<(MusicState, MediaProperties)>> {
    let Some((track, playing)) = pick_session(manager)? else {
        return Ok(None);
    };
    let Track { session, properties, info, title } = track;
    let controls = info.Controls()?;
    let timeline = session.GetTimelineProperties()?;
    let duration_ms = (timeline.EndTime()?.Duration - timeline.StartTime()?.Duration).max(0) as u64 / 10_000;
    let raw_ms = timeline.Position()?.Duration.max(0) as u64 / 10_000;
    let now = now_ms();
    let app_id = session.SourceAppUserModelId()?.to_string();
    let artist = properties.Artist()?.to_string();
    let album = properties.AlbumTitle()?.to_string();
    let key = format!("{app_id}|{title}|{artist}|{album}|{duration_ms}");
    let updated = timeline.LastUpdatedTime()?.UniversalTime.saturating_sub(EPOCH_DIFF_TICKS) / 10_000;
    let mut position_ms = clock.position(key, raw_ms, updated, playing, now);
    if duration_ms > 0 {
        position_ms = position_ms.min(duration_ms);
    }

    let state = MusicState {
        available: true,
        playing,
        title,
        artist,
        album,
        app_name: friendly_app_name(&app_id),
        app_id,
        position_ms,
        position_at: now,
        duration_ms,
        thumbnail: None,
        can_next: controls.IsNextEnabled()?,
        can_previous: controls.IsPreviousEnabled()?,
        youtube_id: None,
        volume: None,
        app_volume: None,
        app_icon: None,
        app_device: None,
    };
    Ok(Some((state, properties)))
}

fn packaged_icon(app_id: &str) -> Option<String> {
    let app = AppInfo::GetFromAppUserModelId(&HSTRING::from(app_id)).ok()?;
    let logo = app.DisplayInfo().ok()?.GetLogo(Size { Width: 64.0, Height: 64.0 }).ok()?;
    read_image(&logo)
}

fn read_image(reference: &RandomAccessStreamReference) -> Option<String> {
    let stream = reference.OpenReadAsync().ok()?.join().ok()?;
    let size = u32::try_from(stream.Size().ok()?).ok()?;
    if size == 0 || size > 8 * 1024 * 1024 {
        return None;
    }
    let reported_mime = stream.ContentType().unwrap_or_default().to_string();
    let reader = DataReader::CreateDataReader(&stream.GetInputStreamAt(0).ok()?).ok()?;
    if reader.LoadAsync(size).ok()?.join().ok()? != size {
        return None;
    }
    let mut buf = vec![0u8; size as usize];
    reader.ReadBytes(&mut buf).ok()?;
    let mime = image_mime(&buf, &reported_mime)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
    Some(format!("data:{mime};base64,{b64}"))
}

fn image_mime<'a>(bytes: &[u8], reported: &'a str) -> Option<&'a str> {
    match bytes {
        [0xff, 0xd8, 0xff, ..] => Some("image/jpeg"),
        [0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a, ..] => Some("image/png"),
        [b'G', b'I', b'F', b'8', _, b'a', ..] => Some("image/gif"),
        [b'R', b'I', b'F', b'F', _, _, _, _, b'W', b'E', b'B', b'P', ..] => Some("image/webp"),
        [b'B', b'M', ..] => Some("image/bmp"),
        _ => reported.strip_prefix("image/").filter(|subtype| !subtype.is_empty()).map(|_| reported),
    }
}

fn friendly_app_name(app_id: &str) -> String {
    let lower = app_id.to_lowercase();
    let known = [
        ("spotify", "Spotify"),
        ("chrome", "Chrome"),
        ("msedge", "Edge"),
        ("firefox", "Firefox"),
        ("308046b0af4a39cb", "Firefox"),
        ("opera", "Opera"),
        ("brave", "Brave"),
        ("zunemusic", "Media Player"),
        ("applemusic", "Apple Music"),
        ("vlc", "VLC"),
        ("deezer", "Deezer"),
        ("tidal", "TIDAL"),
        ("youtube", "YouTube Music"),
    ];
    if let Some((_, name)) = known.iter().find(|(k, _)| lower.contains(k)) {
        return name.to_string();
    }
    app_id
        .rsplit(['\\', '!'])
        .next()
        .unwrap_or(app_id)
        .trim_end_matches(".exe")
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::image_mime;

    #[test]
    fn recognizes_artwork_when_windows_omits_or_mislabels_the_mime_type() {
        assert_eq!(image_mime(&[0xff, 0xd8, 0xff, 0xe0], "application/octet-stream"), Some("image/jpeg"));
        assert_eq!(image_mime(b"\x89PNG\r\n\x1a\n", "image/jpeg"), Some("image/png"));
        assert_eq!(image_mime(b"RIFF\0\0\0\0WEBP", ""), Some("image/webp"));
    }

    #[test]
    fn rejects_an_unrecognized_stream_without_an_image_type() {
        assert_eq!(image_mime(b"not an image", "application/octet-stream"), None);
        assert_eq!(image_mime(b"ftypavif", "image/avif"), Some("image/avif"));
    }
}
