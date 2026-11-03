# Soundtrack page in the menu

Written 2026-11-04. Status: design approved by Michael from Ally frames (layout B, empty state); spec awaiting review. Device check on the ROG Xbox Ally.

Frames: `recordings/2026-11-04-menu-polish/soundtrack-options.png` (today, A, B), `steam-soundtrack-qam.png` (Steam's own tab).

## Why

Our menu's Soundtrack section is a heading and "Open in Steam". Steam's own Soundtrack tab (Quick Access) shows what is playing and its controls in Steam's older look. Michael wants the same in our menu, in the menu's design.

## Decisions (Michael, 2026-11-04)

| Question | Decision |
|---|---|
| What the page holds | Steam's set, our look: now playing (cover, album, track), position, shuffle / previous / play-pause / next / repeat, volume, Browse soundtracks. Nothing Steam's tab cannot do. |
| Layout | B: the cover at the left, everything else in a column at the right; "Browse soundtracks" as the heading's action. |
| Nothing playing | Same layout: a music-note tile in place of the cover, "Nothing playing" and "Pick a soundtrack to start.", Browse in the heading; no controls or sliders. |

## Behaviour

### Page

- Heading "Soundtrack"; action "Browse soundtracks ↗" at the right (the place "Open in Steam" takes elsewhere).
- Left: the album cover, square, as drawn (300px at the menu's design scale), 12px radius.
- Right column, top to bottom:
  - album name (dim label), track name (title size);
  - position: elapsed time, then a slider over the track's length; moving it seeks;
  - controls in one row: shuffle, previous, play/pause (larger, accent), next, repeat. Shuffle and repeat dim while off and light while on; repeat shows its mode (off, all, one) as Steam does;
  - volume: speaker icon and a slider.
- Opening the section puts focus on play/pause.
- Nothing playing: the empty state above. Browse soundtracks stays.
- Playback data unavailable (no Music API, a Steam change): today's heading with "Open in Steam" to Steam's Soundtrack tab, as now.

### Data (to be confirmed by the build's first step)

Read on the Ally 2026-11-04 (names only):
- `SteamClient.Music` has `RegisterForMusicPlaybackChanges`, `RegisterForMusicPlaybackPosition`, `TogglePlayPause`, `PlayPrevious`, `PlayNext`, `SetPlayingShuffled`, `SetPlayingRepeatStatus`, `SetVolume`, `ToggleMuteVolume`, `IncreaseVolume`, `DecreaseVolume`, `SetPlaybackPosition`.
- A soundtrack store (a module export holding `m_mapSoundtrackDetailsData`, a MobX map) with `GetSoundtrackDetails`, `FetchSoundtrackDetails`, `GetTrackDetails`: album and track names and the cover.
- The cover Steam's tab draws is served from `https://steamloopback.host/assets/<appid>/<hash>.jpg`, readable from our menu window.

The build starts with a device spike (with Michael's go-ahead, since it registers callbacks and calls Steam getters, which read-only probes do not): record what the playback and position callbacks deliver while a soundtrack plays, pauses, skips, shuffles and repeats; what `GetSoundtrackDetails` / `GetTrackDetails` return for the playing ids; and which route Steam's "Browse Soundtracks" opens. The design does not change with the answers; the binding code does.

### Writes

- Each control calls its `SteamClient.Music` method; the page shows what Steam's callbacks report next, never the value it asked for (as Quick settings and Performance do).
- Sliders send at most every 100ms while moving and once when released.

### Structure

- A playback service (subscribes while the section is open, releases on close), a pure snapshot type, a pure view (`SoundtrackPanel`) from the snapshot and callbacks, and the section wiring in `MenuShell` in place of today's fallback heading.

## Testing

- Vitest: the view for playing, paused, shuffle/repeat modes, nothing playing and unavailable; the snapshot from recorded callback payloads (fixtures from the spike); controls call the right methods; slider throttling.
- Ally by eye (Michael): every control, seeking, volume, Browse, the empty state, and the page in-game.

## Out of scope

- An album's track list, a soundtrack picker inside our menu, a queue.

## Ships in

4.0.0 on `release/4.0`. Nothing pushed until Michael says.
