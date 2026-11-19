# Friends Cards (game first, A3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home's Friends tab cards say more at a glance: a double card with hero art for each friend in game, A1's art-band card for everyone else, with status, detail, time/device and achievement lines that hide when unknown.

**Architecture:** `friends.ts` (pure) grows the per-friend lines and a session record; a new `friendActivity.ts` caches each friend's latest achievements from Steam's activity service (only if the spike confirms it); `feedLayout.ts` turns cards into wide (in game) or band (others) feed items with typed lines; `FeedCards.tsx` + `homeCss.ts` draw them; `useHomeData.ts` wires the session record and activity in.

**Tech Stack:** TypeScript, React (Decky), vitest; Steam client globals (`friendStore`, service transport as in `src/menu/steam/achievementSets.ts`).

**Spec:** `docs/superpowers/specs/2026-11-19-friends-cards-design.md`

## Global Constraints

- Card height stays `FEED_CARD_H` (260); single width 230; double width `2 * 230 + FEED_GAP` (474).
- At most five text lines per card; each line one line high, ellipsis; a line with nothing to say is not drawn.
- Order unchanged (in game, online, away, offline; offline by last seen online, newest first); limit unchanged (10).
- A, the join confirm, focus keys (`friend-<steamId>`) and the second row unchanged.
- Colours: online/in game `FRIEND_COLOURS.online` (#8cd61d), away `FRIEND_COLOURS.away` (#4cb4ff), offline text dim.
- All copy through `tr()`; sizes through Home's existing units.
- CEF probes read-only: read Steam's code (sp.js on the PS5) before calling anything; call a service only the way Steam does.
- Nothing may delay Home's first paint; activity loads in the background, ≤ once per friend per 5 minutes.
- Reload Game Glance only with no Game Glance page or menu open.

## Review Focus

1. A friend who starts a game while Home is open: their card turns wide in place and focus stays on them (same key) — test in Task 4.
2. Activity fetch rejects, hangs or returns junk: the card shows without the achievement line, no throw, retried no sooner than 5 min — test in Task 3.
3. Very long name / game / status line: one line each, never pushes the achievement line off the card — test in Task 5 (CSS: nowrap + ellipsis on every line class).
4. A friend with no avatar url and no known game: the band shows the soft accent placeholder, never black — test in Task 4.
5. Several friends in game at once (e.g. 4 wide cards): the row scrolls as today, limit still 10 friends — test in Task 4.

---

### Task 1: Spike — confirm the four unsure data rows (read-only)

**Files:**
- Modify: `docs/superpowers/specs/2026-11-19-friends-cards-design.md` (append "## Spike findings")

**Interfaces:**
- Produces, for later tasks, one finding per row (each "confirmed: <exact read path / shape>" or "dropped: <why>"):
  - `statusLine`: how Steam's own friends list gets a friend's rich presence display text (function or field on `persona`/`friend`, and when empty).
  - `lastPlayedAt`: what `friend.m_dtLastSeenPlaying` holds (Date? seconds?) and when Steam sets it.
  - `device`: the `m_eGamingDeviceType` enum → label map from Steam's code (only values Steam itself names; seen 0, 1, 544).
  - `activity`: whether `UserNews.GetUserNews` (or `UserGameActivity.GetActivity`) returns friends' achievement unlocks; request fields, response fields (steamid, appid, achievement name, time), how Steam calls it (transport, privilege).

- [ ] **Step 1:** On the PS5, grep `~/.local/share/Steam/steamui/sp.js` (and `library.js`) around each name above; read Steam's own call sites. Expected: a call site or field use for each, or none.
- [ ] **Step 2:** Only for rows whose read path is a plain getter/field: read it for your 8 friends via `scripts/cef-eval.mjs` (read-only). For the activity service: call it once exactly as Steam's own code calls it, only after Step 1 shows Steam's call site and request shape. Expected: real values or empty.
- [ ] **Step 3:** Write the findings section; every row ends "confirmed" or "dropped". Ledger a `Ruling:` for each dropped row (the card simply omits it).

### Task 2: Friend lines and the session record (`friends.ts`)

**Files:**
- Modify: `src/home/friends.ts`
- Test: `tests/home/friends.test.ts`

**Interfaces:**
- Consumes: Task 1 findings (read paths for `statusLine`, `lastPlayedAt`, `device`).
- Produces:
  - `RawFriend` gains `statusLine?: string; lastPlayedAt?: number /* unix s, 0 unknown */; device?: number`.
  - `export interface Session { appId: number; since: number; until?: number }` and `export type Sessions = Record<string, Session>`.
  - `export function observeSessions(prev: Sessions, friends: RawFriend[], now: number): Sessions` — starts a session when a friend's `gameAppId` goes 0→n (or n→m), sets `until` when it goes n→0; a friend first seen already in game gets **no** session (unknown start).
  - `export function deviceLabel(type: number): string` — '' for unmapped.
  - `FriendCard` gains `detail: string; meta: string; lastAt: number` (`lastAt` unix s of last played, 0 unknown).
  - `mapFriends(friends, appName, limit, last, sessions = {}, now = Date.now())`.

- [ ] **Step 1: Write the failing tests** (names and assertions):
  - `observeSessions starts a session on 0→game and ends it on game→0` — `{a:{appId:5,since:1000}}` then `until:2000`.
  - `observeSessions gives no session to a friend first seen in game`.
  - `in game: detail is the status line, meta is "{n} min · {device}" with only the known parts` — 45 min + mapped device → `'45 min · Steam Deck'` (use the Task 1 label); no session → `'Steam Deck'`; neither → `''`.
  - `offline: detail "Played {game}", meta "{h} h {m} min session" from the ended session` — `'1 h 20 min session'`.
  - `online/away: detail "Last played {game} · {when}" when lastAt is known, "Last played {game}" otherwise`.
  - `unknown everything: detail and meta are ''`.
- [ ] **Step 2:** Run `npx vitest run tests/home/friends.test.ts`. Expected: the new tests FAIL (missing exports/fields).
- [ ] **Step 3:** Implement in `friends.ts`; new copy keys added to the i18n table the way `lastPlayedGame` is (`playedGame`, `sessionLength`, `minutesShort`, `lastPlayedGameAgo`). `readFriends` reads the Task 1 paths inside try/catch (a throw → field absent). `friendsKey` includes `statusLine`, `lastPlayedAt`, `device`.
- [ ] **Step 4:** Run the file, then `npm test`. Expected: PASS, whole suite green.

### Task 3: Friend activity (`friendActivity.ts`) — skip if Task 1 dropped `activity`

**Files:**
- Create: `src/home/friendActivity.ts`
- Test: `tests/home/friendActivity.test.ts`

**Interfaces:**
- Consumes: Task 1 `activity` finding (request/response shape).
- Produces:
  - `export interface Unlock { appId: number; name: string; at: number /* unix s */ }`
  - `export interface FriendAchievements { latest: Unlock | null; lastSession: number /* unlocks in the friend's last session */ }`
  - `export function createFriendActivity(load: (steamId: string) => Promise<unknown>, now: () => number, ttlMs = 5 * 60_000): { get(steamId: string): FriendAchievements | null; want(steamIds: string[]): void; subscribe(fn: () => void): () => void }`
  - `export function parseActivity(raw: unknown, steamId: string): FriendAchievements` (pure; junk → `{latest:null,lastSession:0}`).

- [ ] **Step 1: Write the failing tests:** `parseActivity picks the newest unlock for the friend`; `parseActivity counts unlocks in the friend's last session (same appid, within the last 6 h of the newest)`; `parseActivity returns empty for junk`; `want loads each friend once per ttl` (fake `now`); `a rejected or hanging load leaves get() null and does not throw; retried after ttl` (Review Focus 2); `subscribe fires when a load lands`.
- [ ] **Step 2:** Run `npx vitest run tests/home/friendActivity.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement; a hanging load is abandoned after 10 s (Promise.race), counted as failed. The Steam-side `load` (service call, exactly as Task 1 found Steam does it) lives in `friendActivity.ts` as `steamActivityLoader(): ((steamId) => Promise<unknown>) | null` (null when the transport is missing), following `src/menu/steam/achievementSets.ts`.
- [ ] **Step 4:** Run the file, then `npm test`. Expected: PASS.

### Task 4: Feed items — wide and band friend cards (`feedLayout.ts`)

**Files:**
- Modify: `src/home/feedLayout.ts` (friends branch of `feedItemsRaw`, `FeedItem`, `FeedData`)
- Test: `tests/home/feedLayout.test.ts`

**Interfaces:**
- Consumes: `FriendCard` (Task 2), `FriendAchievements` (Task 3, optional).
- Produces:
  - `FeedData` gains `friendAchievements?: Record<string, FriendAchievements>`.
  - `FeedItem` gains `friendCard?: { layout: 'wide' | 'band'; grey: boolean; lines: FriendLine[] }`.
  - `export type FriendLine = { text: string; tone: 'status-online' | 'status-away' | 'status-offline' | 'detail' | 'meta' | 'achievement' }`.
  - `export const FRIEND_WIDE_W = 2 * WIDTH.friends + FEED_GAP` (474).

- [ ] **Step 1: Write the failing tests:**
  - `a friend in game is one wide item (474) with the game's hero art and JOIN/IN GAME pill`.
  - `others are band items (230) with the last game's wide art; offline ones are grey`.
  - `lines: status coloured by state, then detail, meta, achievement; empty ones left out; at most 4` (the name is `title`, so a card has at most five text lines).
  - `achievement line: "{name} · {ago}" for one, "{n} achievements · last session" for several`.
  - `same key before and after a friend goes in game (focus stays)` (Review Focus 1).
  - `no avatar url and no game: backdrop stays the accent placeholder` (Review Focus 4).
  - `four friends in game: four wide items, still at most 10 friend items` (Review Focus 5).
- [ ] **Step 2:** Run `npx vitest run tests/home/feedLayout.test.ts`. Expected: new tests FAIL.
- [ ] **Step 3:** Implement. Wide art: `art(appId).hero`; band art: `wideArt(art(lastAppId))`, empty when no game (backdrop shows). Keep `title`/`sub`/`pill`/`opens`/`avatar` as today so other code is unaffected; `sub` = the status text.
- [ ] **Step 4:** Run the file, then `npm test`. Expected: PASS.

### Task 5: Drawing the cards (`FeedCards.tsx`, `homeCss.ts`)

**Files:**
- Modify: `src/home/FeedCards.tsx`, `src/home/homeCss.ts`
- Test: `tests/home/friendCardView.test.ts` (new), `tests/home/homeCss.test.ts` if present (else in the new file)

**Interfaces:**
- Consumes: `FeedItem.friendCard` (Task 4).
- Produces: classes `gh-card-friend-wide`, `gh-card-friend-band`, `gh-fc-band`, `gh-fc-lines`, `gh-fc-line gh-fc-<tone>`, `gh-fc-grey`.

- [ ] **Step 1: Write the failing tests:** `a band card draws the band, the avatar on its edge and one element per line in order`; `a wide card draws the avatar top left, the pill top right and the lines from the name down`; `grey cards carry gh-fc-grey`; CSS: `every .gh-fc-line is nowrap with ellipsis` (Review Focus 3); `the band is 150 of 260 (scaled like the card)`; `the achievement line sits at the card's bottom`.
- [ ] **Step 2:** Run the new file. Expected: FAIL.
- [ ] **Step 3:** Implement per the spec's "Double card" and "Single card" sections (mock-up `A3.png`): wide art darkened from the left (gradient to ~75% width) and faded at the bottom; band art faded into the glass; offline band `filter: grayscale(1) brightness(.6)`; trophy icon from `react-icons` (`FaTrophy`) in gold `#f0c454`.
- [ ] **Step 4:** Run the file, then `npm test` and `npx tsc --noEmit`. Expected: PASS, 0 errors.

### Task 6: Wiring and the device check (`useHomeData.ts`)

**Files:**
- Modify: `src/home/useHomeData.ts`
- Test: `tests/home/useHomeData*.test.ts` if a friends case exists there; else none (covered by Tasks 2–4)

**Interfaces:**
- Consumes: `observeSessions`, `mapFriends` (Task 2); `createFriendActivity`, `steamActivityLoader` (Task 3); `FeedData.friendAchievements` (Task 4).

- [ ] **Step 1:** Keep `Sessions` in a module-level variable updated on each friends read (memory only: the plugin lives as long as Steam). Pass it and `Date.now()` to `mapFriends`.
- [ ] **Step 2:** When the Friends tab's friends are known, `activity.want(steamIds of the shown cards)`; subscribe and fold `get()` results into `FeedData.friendAchievements`.
- [ ] **Step 3:** `npm test`, `npx tsc --noEmit`, `npm run build`. Expected: green, 0 errors, built.
- [ ] **Step 4:** Deploy (scp, check no GG page/menu open, reload with time limit). On the PS5: screenshot the Friends tab; check every friend's lines against Steam's own friends list (status, last online), and an in-game friend when one is on.

## Commits

Michael commits when he says: no per-task commits; ledger each task instead.
