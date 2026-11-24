/// Follow Windows' current player when it is playing and has a track.
/// An unavailable session must not hide another player that is playing.
pub(super) fn select_track<S, T, I, E>(
    current: Option<S>,
    sessions: impl FnOnce() -> Result<I, E>,
    read: impl Fn(&S, bool) -> Option<(T, bool)>,
) -> Result<Option<(T, bool)>, E>
where
    S: PartialEq,
    I: IntoIterator<Item = S>,
{
    let fallback = current.as_ref().and_then(|session| read(session, false));
    if matches!(fallback, Some((_, true))) {
        return Ok(fallback);
    }

    let sessions = match sessions() {
        Ok(sessions) => sessions,
        Err(_) if fallback.is_some() => return Ok(fallback),
        Err(error) => return Err(error),
    };
    let playing = sessions
        .into_iter()
        .filter(|session| current.as_ref() != Some(session))
        .find_map(|session| read(&session, true));
    Ok(playing.or(fallback))
}

#[cfg(test)]
mod tests {
    use super::select_track;

    #[derive(Clone, Copy, Debug, PartialEq)]
    enum Session {
        Unreadable,
        MissingTitle,
        Playing,
        OtherPlaying,
        Paused,
    }

    fn pick(current: Option<Session>, sessions: &[Session]) -> Option<Session> {
        select_track(
            current,
            || Ok::<_, ()>(sessions.iter().copied()),
            |&session, playing_only| match session {
                Session::Unreadable | Session::MissingTitle => None,
                Session::Playing | Session::OtherPlaying => Some((session, true)),
                Session::Paused if !playing_only => Some((session, false)),
                Session::Paused => None,
            },
        )
        .unwrap()
        .map(|(session, _)| session)
    }

    #[test]
    fn unreadable_and_untitled_sessions_do_not_hide_a_playing_track() {
        use Session::*;
        let sessions = [Unreadable, MissingTitle, Playing];
        for current in [None, Some(Unreadable), Some(MissingTitle), Some(Paused)] {
            assert_eq!(pick(current, &sessions), Some(Playing));
        }
    }

    #[test]
    fn follows_the_system_current_player_when_both_players_are_playing() {
        use Session::*;
        assert_eq!(
            pick(Some(OtherPlaying), &[Playing, OtherPlaying]),
            Some(OtherPlaying)
        );
    }

    #[test]
    fn falls_back_to_the_current_paused_track() {
        use Session::*;
        assert_eq!(pick(Some(Paused), &[Paused, MissingTitle]), Some(Paused));
        assert!(pick(None, &[Paused, Unreadable]).is_none());
    }

    #[test]
    fn keeps_the_current_track_if_session_enumeration_fails() {
        let result = select_track(
            Some(Session::Paused),
            || Err::<[Session; 0], _>("session manager unavailable"),
            |&session, _| Some((session, false)),
        );
        assert_eq!(result, Ok(Some((Session::Paused, false))));
    }
}
