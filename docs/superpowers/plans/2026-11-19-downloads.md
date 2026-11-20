# Downloads Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Steam's `/library/downloads` page with Game Glance's Storage-style Downloads page (mock-up A2 with Completed).

**Architecture:** A pure model turns Steam's own `downloadsStore` (overview, queue, recently completed, per-second history)
into a view; thin bindings read that store and call `SteamClient.Downloads`; a stateless view draws it with Storage's
look; a route patch on `/library/downloads` shows the page, or Steam's own element when the bindings are unavailable.

**Tech Stack:** TypeScript, React (Decky `@decky/ui`, `@decky/api` routerHook), vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-downloads-design.md` (mock-up `downloads-mockups/A2-final.png`)

## Global Constraints

- Steam's data, read on the PS5 2026-11-19 (`window.downloadsStore`): `LocalDownloadOverview` {update_appid, update_state,
  paused, overall_percent_complete, overall_estimated_time_remaining_sec, update_network_bytes_per_second,
  update_peak_network_bytes_per_second, update_disc_bytes_per_second, progress[7]}; `QueuedTransfers` and `RecentlyCompleted`
  (items {appid, active, paused, completed, queue_index, completed_time, overall_percent_complete?, update_type_info[{has_update,
  completed, progress[7], overall_percent_complete}]}); `DownloadHistory` (samples {appid, rt_sample_time,
  network_bytes_per_second, disc_bytes_per_second, is_upload}).
- Progress stages (Steam's k_EAppUpdateProgress): **2 = Download**, **3 = Staging** (the Install bar). A row's bytes are
  stage 2 summed over `update_type_info` entries with `has_update` (as Steam's own rows).
- Actions exactly as Steam's page calls them, local client id `'0'`: `SetQueueIndex(appid, index, '0')`,
  `ResumeAppUpdate(appid, '0')`, `RemoveFromDownloadList(appid, '0')`, `EnableAllDownloads(enable, '0')` (pause all = false,
  as the Play pill).
- Units: `sizeText` from `src/storage/storageModel.ts` (GB one decimal, MB below 1 GB); Mbps = bytes/s × 8 / 1e6, rounded.
- Graph: the last 300 samples (5 minutes at Steam's 1 s), network bytes/s, no axis labels.
- Copy: title "Downloads"; card "Now downloading" figures "74" + "% installed", "7.1 of 9.5 GB · about 2 min left", bar labels
  "DOWNLOAD" / "INSTALL"; paused card "Paused"; idle card "Nothing downloading"; "Network", "Mbps", "Peak 248", "Disk 261";
  headers "UP NEXT · n", "COMPLETED"; tags "NEXT", "PAUSED"; completed "7.6 GB · finished 12 min ago", "Done".
- Every length in the page CSS through Storage's unit (`unit as u` from `src/styles/tokens`); focus ring = Storage's.
- Reload rule on the device: copy the build, check no Game Glance page or menu is open, then reload.

## Review Focus

- All downloads paused, nothing active (the PS5 right now: overview `update_appid` 0, `paused: true`, 8 queued): the card says
  "Paused" with the first queued game and A resumes it; it must not say "Nothing downloading".
- Nothing queued and nothing active: "Nothing downloading", no "UP NEXT" header, Completed still listed.
- `window.downloadsStore` missing or a getter throwing (another Steam build): Steam's own Downloads page renders.
- The focused queue row removed (Y) or started (A): focus moves to the row now in its place, not lost (Storage's `refocusKey`).
- An item with 0 download bytes (verify-only or shader item): its line has no "of 0 MB"; its percent still shows.

---

### Task 1: The model

**Files:**
- Create: `src/downloads/downloadsModel.ts`
- Test: `tests/downloads/downloadsModel.test.ts`

**Interfaces:**
- Produces:
  - `interface DownloadsInput { overview: RawOverview | null; queued: RawItem[]; completed: RawItem[]; history: RawSample[] }`
    (raw types mirror the Global Constraints' fields, all optional/unknown-safe)
  - `downloadsView(input: DownloadsInput, nameOf: (appId: number) => string, nowMs: number): DownloadsView`
  - `DownloadsView = { current: CurrentCard; network: NetworkCard; queue: QueueRow[]; completed: CompletedRow[] }`
  - `CurrentCard = { mode: 'active' | 'paused' | 'idle'; appId: number | null; name: string; percent: number; line: string;
    download: number; install: number; action: 'pause' | 'resume' | null }` (ratios 0..1)
  - `NetworkCard = { mbps: string; peak: string; disk: string; samples: number[] }` (samples: network bytes/s, oldest first)
  - `QueueRow = { appId: number; name: string; line: string; percent: number; ratio: number; tag: 'NEXT' | 'PAUSED' | null; queueIndex: number; canMoveUp: boolean }`
  - `CompletedRow = { appId: number; name: string; line: string }`
  - `graphPath(samples: number[], width: number, height: number): { line: string; area: string }` (SVG path data)
  - `timeLeftText(seconds: number): string`

- [ ] **Step 1: Write the failing tests**

```ts
describe('downloadsView', () => {
    it('shows the active download: percent, bytes of the Download stage, time left, both bars', () => {
        const v = downloadsView({ overview: overview({ update_appid: 10, update_state: 'Downloading', overall_percent_complete: 74,
            overall_estimated_time_remaining_sec: 120, progress: stages({ 2: [7.1e9, 9.5e9], 3: [7.0e9, 9.5e9] }) }), queued: [], completed: [], history: [] }, name, NOW);
        expect(v.current).toMatchObject({ mode: 'active', appId: 10, percent: 74, line: '7.1 of 9.5 GB · about 2 min left', action: 'pause' });
        expect(v.current.download).toBeCloseTo(7.1 / 9.5); expect(v.current.install).toBeCloseTo(7.0 / 9.5);
    });
    it('all paused, nothing active: the card is the first queued game, Paused, A resumes it (Review Focus)', () => {
        const v = downloadsView({ overview: overview({ update_appid: 0, update_state: 'None', paused: true }),
            queued: [item(20, { queue_index: 1 }), item(30, { queue_index: 0, overall_percent_complete: 1 })], completed: [], history: [] }, name, NOW);
        expect(v.current).toMatchObject({ mode: 'paused', appId: 30, action: 'resume' });
        expect(v.queue.map(r => r.appId)).toEqual([20]);
    });
    it('nothing queued or active: idle card, empty queue (Review Focus)', () => {
        expect(downloadsView({ overview: null, queued: [], completed: [], history: [] }, name, NOW).current).toMatchObject({ mode: 'idle', appId: null, action: null, name: 'Nothing downloading' });
    });
    it('queue rows in queue order without the current game: Download-stage bytes summed, NEXT on the first, PAUSED on paused ones', () => {
        const v = downloadsView({ overview: overview({ update_appid: 10, update_state: 'Downloading' }),
            queued: [item(10, { queue_index: 0 }), item(40, { queue_index: 2, paused: true }), item(30, { queue_index: 1, update_type_info: [uti({ 2: [120e6, 12e9] }), uti({ 2: [0, 1e9] }, false)] })],
            completed: [], history: [] }, name, NOW);
        expect(v.queue.map(r => [r.appId, r.tag, r.canMoveUp])).toEqual([[30, 'NEXT', false], [40, 'PAUSED', true]]);
        expect(v.queue[0].line).toBe('120 MB of 12.0 GB');
    });
    it('a 0-byte item shows no "of 0 MB" (Review Focus)', () => {
        const v = downloadsView({ overview: null, queued: [item(10, { queue_index: 0 }), item(50, { queue_index: 1, update_type_info: [uti({})] , overall_percent_complete: 40 })], completed: [], history: [] }, name, NOW);
        expect(v.queue.find(r => r.appId === 50)).toMatchObject({ line: '', percent: 40 });
    });
    it('completed newest first: size and how long ago', () => {
        const v = downloadsView({ overview: null, queued: [], history: [], completed: [item(60, { completed: true, completed_time: NOW / 1000 - 720, update_type_info: [uti({ 2: [7.6e9, 7.6e9] })] }), item(70, { completed: true, completed_time: 0 })] }, name, NOW);
        expect(v.completed[0]).toEqual({ appId: 60, name: 'Game 60', line: '7.6 GB · finished 12 min ago' });
    });
    it('network in Mbps, the last 300 local samples for the graph', () => {
        const history = Array.from({ length: 320 }, (_, i) => sample(i * 1000));
        const v = downloadsView({ overview: overview({ update_network_bytes_per_second: 31e6, update_peak_network_bytes_per_second: 31e6, update_disc_bytes_per_second: 32.6e6 }), queued: [], completed: [], history }, name, NOW);
        expect(v.network).toMatchObject({ mbps: '248', peak: 'Peak 248', disk: 'Disk 261' });
        expect(v.network.samples).toHaveLength(300); expect(v.network.samples[0]).toBe(20 * 1000);
    });
});
describe('graphPath', () => { it('scales to the tallest sample and closes the area at the bottom', () => {
    const p = graphPath([0, 50, 100], 200, 100);
    expect(p.line).toBe('M0 100 L100 50 L200 0'); expect(p.area).toBe('M0 100 L100 50 L200 0 L200 100 L0 100 Z');
}); });
describe('timeLeftText', () => { it('as Steam rounds it', () => {
    expect(timeLeftText(45)).toBe('under a minute left'); expect(timeLeftText(120)).toBe('about 2 min left'); expect(timeLeftText(3 * 3600 + 600)).toBe('about 3 h 10 min left'); expect(timeLeftText(-1)).toBe('');
}); });
```
(helpers `overview()`, `item()`, `uti()`, `stages()`, `sample()`, `name = id => 'Game ' + id`, `NOW` are local to the test.)

- [ ] **Step 2:** `npx vitest run tests/downloads/downloadsModel.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement `src/downloads/downloadsModel.ts`.** Unknown-safe readers (non-numbers read as 0, missing arrays as []).
  The current card's game, when the overview is idle but the queue is not empty, is the queued item with the lowest
  `queue_index`; that game leaves the queue list. Percent of a queued row: item `overall_percent_complete`, else the first
  `has_update` entry's. `canMoveUp`: not the first row. Completed sorted by `completed_time` descending (0 last); "finished"
  part omitted when `completed_time` is 0; age via whole minutes/hours/days ("12 min ago", "3 h ago", "2 days ago").
- [ ] **Step 4:** run the test file — Expected: PASS.
- [ ] **Step 5: Commit** `feat(downloads): the page model from Steam's download store`.

### Task 2: Steam bindings

**Files:**
- Create: `src/downloads/steamDownloads.ts`
- Test: `tests/downloads/steamDownloads.test.ts`

**Interfaces:**
- Consumes: `DownloadsInput` (Task 1).
- Produces: `createDownloadsBindings(store: unknown, client: unknown): DownloadsBindings` with
  `available(): boolean`, `read(): DownloadsInput | null`, `pauseAll(): boolean`, `resume(appId): boolean`,
  `downloadNow(appId): boolean`, `moveUp(appId, queueIndex): boolean`, `remove(appId): boolean` (false: call missing or threw).

- [ ] **Step 1: Write the failing tests** — with fake store/client objects:
  `read()` copies `LocalDownloadOverview`, `QueuedTransfers`, `RecentlyCompleted`, and `DownloadHistory` filtered to
  `is_upload !== true`; `available()` is false when the store or `SteamClient.Downloads.SetQueueIndex` is missing and
  `read()` returns null when a getter throws; `downloadNow(5)` calls `SetQueueIndex(5, 0, '0')` then `ResumeAppUpdate(5, '0')`;
  `moveUp(5, 3)` calls `SetQueueIndex(5, 2, '0')`; `remove(5)` → `RemoveFromDownloadList(5, '0')`; `pauseAll()` →
  `EnableAllDownloads(false, '0')`; `resume(5)` → `ResumeAppUpdate(5, '0')`; a throwing call returns false.
- [ ] **Step 2:** run — Expected: FAIL.
- [ ] **Step 3: Implement.** `DownloadHistory` may be a MobX array of samples or a map keyed by client id: accept an array,
  or the `'0'` entry of a map.
- [ ] **Step 4:** run — Expected: PASS.
- [ ] **Step 5: Commit** `feat(downloads): read Steam's download store and call its queue actions`.

### Task 3: The page view and styles

**Files:**
- Create: `src/downloads/DownloadsPage.tsx` (view part: `DownloadsPageView`), `src/downloads/downloadsStyles.ts`
- Test: `tests/downloads/downloadsPageView.test.ts`, `tests/downloads/downloadsStyles.test.ts`

**Interfaces:**
- Consumes: `DownloadsView`, `graphPath` (Task 1).
- Produces: `DownloadsPageView({ view, art, onCurrent, onQueue, onCompleted, onBack, onOptions })` where
  `onQueue(row: QueueRow, button: 'a' | 'x' | 'y')`, `onCompleted(row: CompletedRow, button: 'a' | 'y')`; focus keys
  `downloads:current`, `downloads:queue:<appId>`, `downloads:done:<appId>`.

- [ ] **Step 1: Write the failing tests** (Storage's view-test style, `@decky/ui` mocked):
  title, card figures and both bar widths; the paused card shows "Paused"; the current card has
  `onOKActionDescription` 'Pause' / 'Resume' (none when idle, and then it is not focusable); queue rows carry
  `onOKActionDescription: 'Download now'`, X 'Move up' only when `canMoveUp`, Y 'Remove'; completed rows 'Game page' and Y
  'Remove'; "UP NEXT · 2" header only with rows; "COMPLETED" only with rows; the graph's `<path>`s use `graphPath` output;
  the root's Start button is 'Options'. Styles: list scroll-padding as Storage's, no bare px lengths except 1px/2px ring.
- [ ] **Step 2:** run — Expected: FAIL.
- [ ] **Step 3: Implement** the view with Storage's structure (`gg-dl` root, left column `gg-dl-side` with the current card
  and `gg-dl-network`, right `gg-dl-games` with eyebrows outside the scrolling `gg-dl-list`), sizes from mock-up A2
  (left column 520 units, rows 96 tall, completed rows 72, art 168×79 / 110×52), Storage's tokens and focus ring.
- [ ] **Step 4:** run — Expected: PASS.
- [ ] **Step 5: Commit** `feat(downloads): the Downloads page view (A2 with Completed)`.

### Task 4: The live page and the route

**Files:**
- Modify: `src/downloads/DownloadsPage.tsx` (add `DownloadsPage`, `DownloadsGate`)
- Create: `src/patches/downloadsPage.tsx`
- Modify: `src/index.tsx` (patch on load, remove on unload, as the other patches)
- Test: `tests/downloads/downloadsGate.test.ts`, `tests/patches/downloadsPage.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `patchDownloadsPage(): () => void`; `DownloadsGate({ native }: { native: ReactNode })`.

- [ ] **Step 1: Write the failing tests:** the gate renders `native` when `bindings.available()` is false or `read()` is
  null, the page otherwise (bindings injectable); the route patch wraps `routeProps.children` in the gate and leaves an
  unknown shape (no element child) untouched; removing the patch calls `routerHook.removePatch('/library/downloads', handle)`.
- [ ] **Step 2:** run — Expected: FAIL.
- [ ] **Step 3: Implement.** `DownloadsPage` re-reads `bindings.read()` every 1000 ms while mounted (Steam's overview cadence)
  and builds the view with names from `appStore.GetAppOverviewByAppID(id)?.display_name` (fallback `App <id>`) and art
  from `landscapeUrls(appId, browserStores)[0]`. First focus: `downloads:current` when focusable, else the first queue
  row. A on the card → `pauseAll()` / `resume(appId)`; queue A → `downloadNow`, X → `moveUp`, Y → Storage's `ConfirmModal`
  ("Remove <name> from the queue?", "Remove") then `remove`; completed A → `Navigation.Navigate('/library/app/<id>')`,
  Y → `remove`; Start → `Navigation.Navigate('/settings/downloads')`; B → `NavigateBack`. Refocus after a row leaves with
  `refocusKey` (Storage's rule, keys adapted).
- [ ] **Step 4:** run the new tests, then `npx vitest run` and `npx tsc --noEmit -p .` — Expected: all pass, 0 errors.
- [ ] **Step 5: Commit** `feat(downloads): Game Glance's Downloads replaces Steam's page`.

### Task 5: Device check (PS5)

- [ ] `npm run build`, copy, reload with no page or menu open.
- [ ] Open Downloads from Navigate and from the status bar icon; compare figures with Steam's (temporarily remove the patch
  only if a figure looks wrong). Check the Review Focus states that exist on the device (all paused now).
- [ ] A on the paused card resumes; A on the active card pauses; queue A / X / Y; a finished download appears in Completed.
