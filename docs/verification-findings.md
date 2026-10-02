# Verification findings (desk, 2026-10-02)

## Unifideck registry (source: mubaraknumann/unifideck `py_modules/unifideck/services/shortcut/registry.py`)
- File: `~/.local/share/unifideck/shortcuts_registry.json`, a JSON object.
- Keys: the shortcut launch options, shaped `"<store>:<game_id>"`.
- Entry fields: `appid` (signed 32-bit, as in shortcuts.vdf), `appid_unsigned`, `title`, `created`, `last_seen`.
- Consequence: `APPID_FIELDS` must include `appid` and `appid_unsigned`; comparison normalizes to unsigned 32-bit.

## Steam class maps (source: @decky/ui 4.12.1 `dist/utils/static-classes.{js,d.ts}`)
- `appDetailsHeaderClasses` is located by its `TopCapsule` key, so `TopCapsule` exists.
- `playSectionClasses` (located by `PlayBarDetailLabel`) includes `Container`.
- `appDetailsClasses` (located by `HeaderLoaded`) includes `InnerContainer`.

## Page insertion anchor (source: morwy/hltb-for-deck f5d203f `src/patches/LibraryApp.tsx`)
- Insert before the `InnerContainer` child whose props have `childFocusDisabled`, `navRef`, and `children.props.{details, overview, bFastRender}`; working as of September 2026.

## Not verified (checked on first install, Task 11)
- `overview.minutes_playtime_forever` (playtime) and `details.achievements.{nAchieved, nTotal}`.
- Failure mode if wrong: playtime shows `0 h` / achievements hidden; page still renders.
- `SteamClient.Settings.GetCurrentLanguage()` (falls back to `english`).

## HowLongToBeat changes (found on first install, 2026-10-02)
- Since ~2026-09-26 `/api/search/site/init` returns only `{"token": …}`; the f5d203f client rejected it ("incomplete auth response"). Fixed by upstream PR #68 (vendored).
- `/_next/data/<buildId>/game/<id>.json` now returns 403 without a browser-like User-Agent (node, aiohttp and empty UA all rejected). The vendored client sent no headers there; local patch adds its base headers.
- Live check: `pnpm check:hltb` (network; not part of `pnpm test`).

## Confirmed on device (2026-10-02)
- `overview.minutes_playtime_forever` and `details.achievements.{nAchieved, nTotal}` work (42.4 h, 13/78 on The Witcher 3).
