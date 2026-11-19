# Media page — design

Status: approved and built (2026-11-19; PS5 changes in §4). Mock-ups: `~/Documents/Claude/Bazzite/page-mockups/media-M1.png`,
`media-M3b.png`, `media-M4.png`. Built on the page kit (`src/pageKit`, spec 2026-11-19-library-page-design §1).

## Why

Steam's Media page is a manager: select mode, filters, sharing, uploading. Michael wants Game Glance's version to be
for looking at what you captured (an overview of everything, one shot large with its details, full screen) and to do
the common actions itself, as Downloads and Storage do: face buttons, Steam's own calls, a confirmation before anything
destructive. Console first, few presses. The second page on the kit, kept small on purpose; Settings home follows.

## Goals

- Game Glance's Media replaces Steam's Media page everywhere it opens (Steam's menu, Navigate), as the Library does.
- **M1 gallery:** all screenshots and clips, newest first, grouped by day ("Today", "Yesterday", then "12 November");
  tabs on L1/R1: All · N, Screenshots · N, Recordings · N. Clips show their length on the tile.
- **M3b viewer:** A on a screenshot opens it large with its game's logo, name, date and time, and size in pixels; its
  first, focused action is **Full screen**; a filmstrip of its neighbours below.
- **M4 full screen:** the shot alone; a thin strip (game, date, "2 of 6") that fades after a moment; L1/R1 previous and
  next; B back to the viewer.
- **Actions on the page** (Michael, 2026-11-19, the Downloads/Storage pattern): X Upload to Steam (asks who can see
  it), Y Delete (asks first, says it can't be undone), ≡ Steam's media for the rest; an uploaded shot shows "Uploaded".

## Non-goals

- Sharing to a friend or chat, captions, spoiler tags, exporting clips: Steam's page does those (≡ Steam's media).
- Playing clips: A on a clip opens Steam's own clip player.
- Cloud (uploaded-only) screenshots: only the ones on this device, as Steam's page lists them first.

## Anti-goals

- Nothing destructive without a confirmation that names what goes and says it can't be undone.
- No invented data: a fact Steam doesn't give (a shot's game name for an unknown app) is left out, not guessed.
- Never blocks Steam's own Media page, game pages or Home.

## Constraints (read from steamui/sp.js and the PS5, 2026-11-19)

- Route: Big Picture mounts the whole Media page at `/media` (non-exact; also `/media/grid`, `/media/list`,
  `/media/item/:type/:id`). One `routerHook.addPatch('/media', …)` takes it, as `/library` for the Library.
- Screenshots: `SteamClient.Screenshots.GetAllAppsLocalScreenshotsCount()` then
  `GetAllAppsLocalScreenshotsRange(start, end)` in pages of 1000, as Steam's page does. Each entry: `nAppID`,
  `strGameID`, `hHandle`, `nWidth`, `nHeight`, `nCreated` (unix s), `strUrl` (relative, e.g.
  `screenshots/7/screenshots/20261118003725_1.jpg`; Steam turns it into a full url with a helper the builder reads in sp.js).
  The PS5 has 4 today.
- Clips: `window.g_GRS` (Steam's CGameRecordingStore): `GetClipSummaries` / its `m_clips` map, loaded lazily the way
  Steam's page loads them. The PS5 has none today.
- Names: a Steam game's name from `appStore`; a shortcut's from `screenshotStore.GetShortcutDisplayName(strGameID)`.
- Same takeover rules as the Library: never throw from the patch, fall back to Steam's element, reload only with no
  Game Glance page open.

## Approaches

**Scope.** (A) View only, Steam's page for every action — first chosen, then dropped: Michael prefers the page to
take care of it. (B) The common actions on the page, as Downloads and Storage — **chosen** (Upload, Delete; no Show
in folder, a desktop thing).

**Takeover.** As the Library: patch `/media` with a gate (chosen; one Media page). A separate Game Glance page was
not considered again, since Michael chose replacement for the Library.

## Design

### 1. Route and gate (`src/patches/mediaPage.tsx`, `src/media/MediaGate`)

- Our page when: a "Media page" setting is on (default on, beside "Library page"), the screenshots can be listed, and
  the user hasn't chosen Steam's Media for this visit.
- ≡ → "Steam's media" sets that choice and keeps it while the path stays under `/media`; leaving resets it (as the
  Library's `keepsNative`).
- A on a clip: set the same choice and navigate to `/media/item/clip/<id>`, so Steam's page and player show it; B
  returns to Steam's grid, and leaving Media resets it.
- While Steam leaves the route (a game page opened elsewhere), the gate keeps its last choice, as the Library's.

### 2. Data (`src/media/mediaModel.ts`, `src/media/steamMedia.ts`)

- One item list: screenshots (`{ kind: 'shot', id: `${strGameID}_${hHandle}`, appId, gameId, created, width,
  height, url }`) and clips (`{ kind: 'clip', id, appId, created, durationMs, thumbnail }`), newest first.
- Day groups: "Today", "Yesterday", else "12 November" (with the year when not this year), in local time.
- Tab counts from the list. Read when the page opens; Steam's screenshot notification ("written") adds a new shot while
  the page is open.

### 3. Layout (mock-ups, units at 1920 × 1080, kit frame)

- **Gallery (M1):** title "Media"; tabs at y 150 with the kit's Tabs; day eyebrows; tiles 330 × 186 (16:9), 20 apart,
  5 per row, rows windowed like the Library's; a clip tile shows ▶ and its length; the page's backdrop is the newest
  shot blurred.
- **Viewer (M3b):** the shot 1280 × 720 at left; a glass panel at right with the game's logo (the Library's logo
  component), its name, date and time, "Screenshot · 2560 × 1440", "Uploaded" once it is; actions as kit rows, each
  with its button glyph: **Full screen** (A, focused), **Upload to Steam** (X; hidden once uploaded), **Delete** (Y),
  **Steam's media** (≡); a filmstrip of 7 neighbours below, the current one ringed.
- **Full screen (M4):** the shot `object-fit: contain` on black; the strip at the top fades out after 2.5 s and comes
  back on any press; L1/R1 previous/next (wrapping, as the tabs); B back to the viewer on the same shot.

### 4. Controls (Steam's footer shows each)

| Where | A | X | Y | ≡ |
|---|---|---|---|---|
| Gallery, screenshot tile | View | Upload to Steam | Delete | Steam's media |
| Gallery, recording tile | Play (Steam's player) | | Delete | Steam's media |
| Viewer | Full screen | Upload to Steam | Delete | Full screen |
| Full screen | | Upload to Steam | Delete | |

- L1/R1: tabs in the gallery; previous/next shot in the viewer and full screen (wrapping), as D-pad left/right there.
  B: one step back each time, to the same item.
- PS5 check (Michael, 2026-11-19): the viewer's rows carry no button badges (pressed with A; the footer shows X/Y/≡);
  its rows are Full screen, Upload to Steam, Delete — Steam's media only from the gallery's ≡; a focused row is light
  with dark text.

### 5. Actions (Steam's own calls, as its Media page makes them; read in sp.js 2026-11-19)

- **Upload:** a small menu "Who can see it?": Public, Friends only, Private (Steam's privacy values, read by the
  builder from Steam's `s$` helper), then `SteamClient.Screenshots.UploadLocalScreenshot(strGameID, hHandle, privacy)`
  → true/false. Success marks the shot "Uploaded"; failure shows "Couldn't upload" and changes nothing.
- **Delete a screenshot:** Steam's confirm dialog ("Delete screenshot?" · "It is removed from this device. This can't
  be undone." · Delete / Cancel), then `SteamClient.Screenshots.DeleteLocalScreenshots([{ gameID, rgHandles:
  [hHandle] }])` → `{ bSuccess, rgFailedRequestIndices }`. On success the item leaves the list and focus moves to the
  next one (the previous at the end; the gallery when it was the last); in full screen, to the next shot.
- **Delete a recording:** the same dialog ("Delete recording?"), then `g_GRS.DeleteClip(clipId)`.
- Nothing is removed from the page until Steam reports success.

## Calls I made (for Michael to check)

1. A "Media page" on/off setting, default on, as for the Library.
2. The actions are Upload and Delete (plus Full screen and Steam's media); M3b's Share, Favourite and Show in folder
   are left out (Steam's share sheet, no favourites in Steam's media, folders are a desktop thing).
6. Upload asks who can see it each time (Steam's own upload asks too).
3. Only screenshots on this device, not uploaded-only ones.
4. Full screen's strip fades after 2.5 s.
5. The gallery's backdrop is the newest shot, blurred.

## Left to the builder

- Steam's url helper for `strUrl`, clip summary fields and thumbnail loading (read in sp.js, read-only probes).
- Component and file split inside `src/media/`.

## Testing

- Unit: item list building and sorting, day grouping and labels, tab counts, the gate's decision table, url building,
  full screen's previous/next wrapping, where focus goes after a delete, upload and delete results (success, failure,
  partial) with fake Steam calls.
- Device (PS5): take a few screenshots first (and one recording if possible); open Media from Steam's menu; tabs;
  viewer and full screen with L1/R1; B back each step to the same item; upload one shot (Private); delete one shot
  taken for the test; ≡ to Steam's media and back after leaving.
