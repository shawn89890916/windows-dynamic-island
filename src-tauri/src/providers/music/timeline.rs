//! 为缺少有效更新时间的播放器保留本地计时锚点。

#[derive(Default)]
pub(super) struct TimelineClock {
    sample: Option<Sample>,
}

struct Sample {
    track: String,
    raw_ms: u64,
    updated: i64,
    position_ms: u64,
    at: u64,
    playing: bool,
}

impl TimelineClock {
    pub fn reset(&mut self) {
        self.sample = None;
    }

    pub fn position(
        &mut self,
        track: String,
        raw_ms: u64,
        updated: i64,
        playing: bool,
        now: u64,
    ) -> u64 {
        let position_ms = if updated > 0 && updated as u64 <= now {
            raw_ms.saturating_add(if playing { now - updated as u64 } else { 0 })
        } else if let Some(previous) = &self.sample
            && previous.track == track
            && previous.raw_ms == raw_ms
            && previous.updated == updated
        {
            // 同一份无效时间线不能在每次轮询时把已走过的时间清零。
            previous.position_ms.saturating_add(if previous.playing {
                now.saturating_sub(previous.at)
            } else {
                0
            })
        } else {
            raw_ms
        };
        self.sample = Some(Sample {
            track,
            raw_ms,
            updated,
            position_ms,
            at: now,
            playing,
        });
        position_ms
    }
}

#[cfg(test)]
mod tests {
    use super::TimelineClock;

    #[test]
    fn missing_timestamp_advances_across_polls() {
        let mut clock = TimelineClock::default();
        for now in [1000, 1500, 2000, 2500] {
            assert_eq!(clock.position("track".into(), 0, 0, true, now), now - 1000);
        }
    }

    #[test]
    fn future_timestamp_uses_local_clock() {
        let mut clock = TimelineClock::default();
        assert_eq!(
            clock.position("track".into(), 5000, 100_000, true, 1000),
            5000
        );
        assert_eq!(
            clock.position("track".into(), 5000, 100_000, true, 2000),
            6000
        );
    }

    #[test]
    fn pause_freezes_and_resume_continues() {
        let mut clock = TimelineClock::default();
        clock.position("track".into(), 0, 0, true, 1000);
        assert_eq!(clock.position("track".into(), 0, 0, false, 2000), 1000);
        assert_eq!(clock.position("track".into(), 0, 0, false, 5000), 1000);
        assert_eq!(clock.position("track".into(), 0, 0, true, 6000), 1000);
        assert_eq!(clock.position("track".into(), 0, 0, true, 6500), 1500);
    }

    #[test]
    fn seek_track_change_and_disconnect_reset_anchor() {
        let mut clock = TimelineClock::default();
        clock.position("a".into(), 0, 0, true, 1000);
        assert_eq!(clock.position("a".into(), 30_000, 0, true, 2000), 30_000);
        assert_eq!(clock.position("b".into(), 0, 0, true, 3000), 0);
        clock.reset();
        assert_eq!(clock.position("b".into(), 0, 0, true, 5000), 0);
    }

    #[test]
    fn valid_timestamps_remain_authoritative() {
        let mut clock = TimelineClock::default();
        assert_eq!(clock.position("a".into(), 5000, 1000, true, 2000), 6000);
        assert_eq!(clock.position("a".into(), 5000, 1000, true, 2500), 6500);
        assert_eq!(clock.position("a".into(), 1000, 3000, true, 3000), 1000);
        assert_eq!(clock.position("a".into(), 1000, 3000, false, 4000), 1000);
    }
}
