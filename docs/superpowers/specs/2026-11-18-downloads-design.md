# Downloads in the Game Glance look — design (2026-11-18)

## Why

Michael was downloading games on the PS5 and wants Steam's Downloads page in the same overhaul as Game Glance's
Storage screen. He picked **mock-up A** (`downloads-mockups/A-storage-style.png`): Storage's layout; then, from three
versions of it (2026-11-19), **A2 with a Completed section** (`downloads-mockups/A2-final.png`): Steam's speed graph kept,
because Game Glance should not drop what Steam's page has.

## Approaches (2026-11-19)

- A1: network folded into the current card, Pause hint there, slimmer queue, Completed section. Compact, but no graph.
- **A2 (picked, with A1's Completed section): a Network card with Steam's speed graph.** Keeps Steam's graph.
- A3: Storage's drive card at left, the current download as the queue's expanded first row. Most like Storage; no graph.

## What (A2 with Completed)

- **Title** "Downloads" top-left, on the same dark, blurred background as Storage.
- **Left column, frosted cards:**
  - **Now downloading**: the game's art, its name, a big **percent** ("74 % installed"), "7.1 of 9.5 GB · about 2 min
    left", and two thin bars, **Download** and **Install** (Steam's stages). When paused it says so.
  - **Network**: a big **Mbps** figure, "Peak …" and "Disk …" beside it, and under them a **speed graph** (filled line,
    as Steam's page has).
  - Nothing downloading: one card "Nothing downloading" (and the queue below, if any).
- **Right column:** "UP NEXT · n", then one rounded row per queued game: its art, name,
  "120 MB of 12.0 GB", its percent on the right with a thin bar under the row; the game next in line is marked **NEXT**;
  a paused one says **Paused**.
- **Completed** under the queue: recently finished downloads, one quieter, shorter row each (art, name, "7.6 GB · finished
  12 min ago", "Done" on the right), as Steam's page lists them.
- **Buttons** (Steam's footer hints, as on Storage):
  - On the current download card: **A** pause / resume.
  - On a queued game: **A** download it now (to the top of the queue), **X** move up, **Y** remove from the queue
    (asks first, as Storage's Uninstall).
  - On a completed game: **A** its game page, **Y** remove it from the list (Steam's own clear).
  - Start: Options (Steam's download settings).

## Where

Steam's **`/library/downloads`** route is replaced (Decky's `routerHook.addPatch` can reach it), so every way in shows it:
the Navigate tile, the status bar's download icon, Steam's own links. If Steam's download data is missing (another Steam
build), Steam's own page shows.

## Data and actions (read on the PS5, 2026-11-18)

- `SteamClient.Downloads.RegisterForDownloadOverview`: speeds (network, peak, disk), per-stage bytes done/total and time
  left, paused, the current app. `RegisterForDownloadItems`: the queue (appid, queue index, active, paused, completed,
  per-stage percent and bytes). Game Glance already subscribes to both (`home/downloadStore`); the page extends that model.
- Actions: `PauseAppUpdate` / `ResumeAppUpdate`, `SetQueueIndex` (download now), `MoveAppUpdateUp`,
  `RemoveFromDownloadList`.

## Builder's calls

- The graph: Steam's own per-second history (`downloadsStore.DownloadHistory`, found 2026-11-19), the last 5 minutes, the
  same data Steam's page draws; nothing recorded by Game Glance. No axis labels; the figures above it are the numbers.
- Data source (2026-11-19): Steam's `downloadsStore` getters (LocalDownloadOverview, QueuedTransfers, CompletedTransfers,
  DownloadHistory), re-read once a second while the page is open.
- All paused (Steam's Pause download): the card shows the first queued game as Paused, A resumes it.
- The queue header is "UP NEXT · n" (Steam has no single auto-updates on/off to show).
- Footer: Start = Options (Steam's download settings); Change Device is not offered (non-goal).
- Completed: the items Steam marks completed, newest first; rows quieter than the queue's (no percent, no bar).
- The queue shows as many rows as fit, then scrolls (as Storage's list).
- Art: the library header (as Storage), else the store header.
- Units: GB/MB with one decimal, like Storage.

## Non-goals

Managing downloads on other devices (Steam's Change Device stays Steam's), bandwidth limits, download history beyond
recent completions.

## Check

On the PS5 during downloads: the page opens from Navigate and from the status bar icon; numbers match Steam's; the graph
moves with the speed; pause / resume, download now, move up and remove (with its question) act on Steam's queue; a
finished download moves to Completed.
