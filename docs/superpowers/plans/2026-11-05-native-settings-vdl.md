# Native Settings VDL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Apply the handheld-first VDL shell to native Settings while retaining Steam's complete category list, controls and behavior.

**Architecture:** A main-window host owns a disposable, route-scoped presentation lease. Capability-based discovery identifies the native shell and standard controls; measured chrome bounds determine its safe area. Nonstandard page content keeps native geometry. A decorative backdrop uses actual resolved game artwork, with a neutral fallback when no valid source is available.

**Tech Stack:** Existing TypeScript, React, Decky global components, native DOM/CSS, ResizeObserver/MutationObserver, Vitest and production-browser fixtures. No new dependency or backend RPC.

**Spec:** `docs/superpowers/specs/2026-11-05-native-settings-vdl-design.md`

**Execution:** Native, preserving Michael's earlier execution-method preference. This written plan requires review before implementation under the writing-plans workflow.

## Global Constraints

- Steam owns categories, controls, settings values, permissions, actions, loading/error states, focus nodes and scrolling.
- Preserve every applicable category/option; completeness means reachable through scrolling, not simultaneous visibility.
- Approximately 44px is a starting minimum setting-row target on the inspected handheld CSS viewport, not a fixed height.
- Measure status/header and both footer hint cards; do not assume a fixed 32px footer clearance.
- No screenshot of a previous page as a production backdrop. No backend setting writes during mount/navigation checks.
- Missing capabilities leave the page native and usable. Styling and subscriptions must be fully disposable.
- No version, dependency, lockfile or stored-preference schema change.
- Never collect account identifiers, Friends content, network names or device credentials in validation artifacts.

## Review Focus

- Dense/nonstandard pages retain all native content and scrolling; test Storage-style lists and Downloads-style controls outside standard row wrappers in Tasks 1/3.
- Dynamic/localized descriptions expand past the minimum row height and remain focus-visible; browser fixtures in Task 3.
- Native/custom footer ownership and UI-scale changes update both bottom safe areas; geometry and resize fixtures in Tasks 2/3.
- Portal ownership cannot spill into unrelated menus or survive route changes; ownership tests in Tasks 3/4.
- Late artwork/account changes cannot show another session's backdrop; generation/account tests in Task 4.

## Evidence and integration decisions for review

Read-only native Ally snapshots visited all **25** current categories through Steam's own sidebar. Each retained the same 25-category shell. Audio has 6 standard rows; System 44 and Developer 35. Storage has a tabbed/list structure and no standard rows. Downloads, Cloud, Family, Game Recording and Store also contain controls outside the Audio-style row structure. These are brief structural snapshots, not full loading, controller or visual acceptance. Aggregate inventory: this chat's `settings-handheld/trial/settings-inventory.json`.

Proposed activation: make the presentation part of the existing custom-menu opt-in, requiring master `settings.enabled` and `menuPreferences.enabled` after successful preference loading. Disabling either restores native Settings. Do not tie it to Home's footer opt-in, and do not introduce a new settings toggle/schema in this change.

Proposed backdrop boundary: retain the resolved current Home/game artwork context when entering Settings, using account/source-owned `heroShownContext()` and `resolveArt()`. Observe the source while outside Settings and invalidate on account change; never select a random library game. Render the actual artwork under translucent surfaces with the existing calm-filter treatment and supported same-document blur. This is artwork-backed frost, not live game-frame capture. Where there is no valid artwork context, use a neutral VDL surface. Extending the menu's Gamescope shader leases to full-screen native Settings/live gameplay is outside this plan; do not reuse fake region geometry to acquire that effect.

### Task 1: Native shell discovery and structural inventory

**Files:** Create `src/nativeSettings/model.ts`, `src/nativeSettings/discovery.ts`, `tests/nativeSettings/discovery.test.ts`.

**Interfaces:** `NativeSettingsShell = {container:HTMLElement; layout:HTMLElement; navigation:HTMLElement; pane:HTMLElement; page:HTMLElement|null}`; `discoverNativeSettings(doc:Document,path:string|null):NativeSettingsShell|null`; `standardSettingRows(page:HTMLElement):readonly HTMLElement[]`. Discovery is read-only and never enumerates a replacement category list.

- [x] Write failing tests for valid `/settings/audio`, nested Settings routes, remounted content, absent/malformed sidebar, unrelated `.DialogContent`, and Storage/Downloads fixtures that preserve controls outside standard sections. Assert discovered node identity and unchanged category/control counts.
- [x] Run `pnpm exec vitest run tests/nativeSettings/discovery.test.ts`; observe the missing implementation failures.
- [x] Implement the verified `.PageListColumn`/native shell boundary and readable roles/classes. Standard rows are eligible for spacing only when their structure is recognized; otherwise retain native geometry.
- [x] Rerun the file; all cases pass. Commit this independently testable boundary.

### Task 2: Measured safe areas

**Files:** Create `src/nativeSettings/geometry.ts`, `tests/nativeSettings/geometry.test.ts`; modify `src/home/homeControlsDom.ts` to export a read-only `homeFooterGroups(doc:Document):readonly HTMLElement[]` using its existing footer discovery.

**Interfaces:** `Rect={left:number;top:number;width:number;height:number}`; `settingsLayout(input:{width:number;height:number;headers:readonly Rect[];footers:readonly Rect[]}):{left:number;top:number;width:number;height:number;sidebarWidth:number}|null`; `observeSettingsLayout(doc:Document,changed:(layout:ReturnType<typeof settingsLayout>)=>void):()=>void`.

- [x] Write failing tests: 828×466 with no chrome gives 8px outer margins and 164px sidebar; a header ending at 36px yields top 44px; footer groups starting at 430px and 422px yield content bottom 414px; hidden/zero bounds are ignored, invalid dimensions return null. A 1280px viewport caps panel width at 1140px and sidebar at 210px.
- [x] Add observation tests for header/footer replacement, two unequal corner cards, UI resize and disposal. Never use the full `#Footer` wrapper as a corner-card rectangle.
- [x] Run the geometry test file and observe failures; implement pure layout plus coalesced observation using actual visible status/header and footer groups. Sidebar uses 20% of viewport width rounded to the nearest 4px, clamped within 128–210px; unusably narrow content falls back to native.
- [x] Rerun geometry/footer tests; commit. Do not take a second footer lease or replace existing chrome ownership.

### Task 3: Scoped presentation lease and native popup styling

**Files:** Create `src/nativeSettings/styles.ts`, `src/nativeSettings/presentation.ts`, `tests/nativeSettings/presentation.test.ts`, `scripts/fixtures/native-settings-preview.ts`, `scripts/native-settings-preview.mjs`.

**Interfaces:** `createSettingsPresentation(doc:Document):{update(shell:NativeSettingsShell|null,layout:ReturnType<typeof settingsLayout>,backdrop:{url:string;mode:'full'|'fallback'}|null):void;dispose():void}`. The lease owns only its markers, styles, decorative artwork layer and popup scope.

- [x] Write failing DOM tests for retained node/event-handler identity, pre-existing attribute restoration, page replacement, repeated updates without accumulating nodes, route-away cleanup, and unrelated popup exclusion.
- [x] Write popup ownership tests: only a popup opened from an active Settings control receives the scope; B/close/route change removes it, and no focus is programmatically stolen. Keep native popup creation, activation and focus return intact.
- [x] Implement VDL surfaces, readable body text, restrained selected-category styling and a single focus target. Use minimum row height, not fixed height; preserve multiline descriptions and complex native control geometry. Omit sidebar separators only if they remain decorative and all tabs are untouched.
- [x] Build native-shaped preview fixtures for Audio, long descriptions, dense notifications, tabbed Storage, Downloads, loading, disabled/error states, and a body-portalled dropdown. Keep fixture code outside product code.
- [x] Run mounted tests and browser fixtures at 828×466, 1280×800 and 1600×900. Assert no document overflow, 44px minimum eligible rows, long-row expansion, all category/control counts preserved, and the first/last focused controls fully above both footer cards. Verify native scrolling in fixtures, bright/dark artwork, selected-versus-focused states and popup dismissal.
- [x] Commit passing presentation and fixture work.

### Task 4: Production lifecycle, backdrop source and activation

**Files:** Create `src/nativeSettings/NativeSettingsHost.tsx`, `src/nativeSettings/runtime.ts`, `src/nativeSettings/backdrop.ts`, `tests/nativeSettings/runtime.test.ts`, `tests/nativeSettings/backdrop.test.ts`; modify `src/index.tsx` to register/remove the global host.

**Interfaces:** `SettingsBackdrop={url:string;mode:'full'|'fallback'}|null`; `createSettingsBackdrop(deps:{readContext():{account:string|null;appId:number|null};resolve(appId:number):Promise<Art>;subscribe(changed:()=>void):()=>void}):{get():SettingsBackdrop;subscribe(changed:()=>void):()=>void;dispose():void}` using the existing `Art` type; `startSettingsPresentation(doc:Document,deps:{route:RouteSource;backdrop:ReturnType<typeof createSettingsBackdrop>}):()=>void`.

- [x] Write failing tests for master/menu opt-in combinations, preference loading/failure, Settings route entry/exit, nested content replacement, side-menu/screensaver suspension and unload. No polling or observation when disabled; exactly one owned lifecycle when enabled.
- [x] Write backdrop tests for current Home/game context, no-context neutral fallback, delayed image resolution after route/account changes, failure recovery and disposal. Assert stale art never appears after account invalidation.
- [x] Implement the host using the main-document marker pattern from `ChromeHost`, existing master/menu preference subscriptions and `routeSource` for the native main-window history. Use disposable route/DOM/resize observers coalesced to animation frames rather than the trial's interval/session globals.
- [x] Capture real context outside Settings: game route app ID or `heroShownApp()`; use `heroArtFor()`/`resolveArt()` and clear invalid context on account change. The decorative source must not be a screenshot, contain settings text, intercept input or manufacture game context. Apply a neutral fallback when unavailable.
- [x] Register/unregister the host alongside existing global components; verify one failing cleanup step cannot suppress other plugin cleanup. Run all new tests and existing index/chrome/menu lifecycle tests. Commit.

### Task 5: Full validation and reviewable Ally candidate

**Files:** Create `docs/validation/native-settings-vdl.md`; update the design status and this plan's completion boxes as evidence is established.

- [x] Run fresh `pnpm test`, `pnpm typecheck`, `pnpm build` and `git diff --check`; report any failure by name and resolve relevant failures before completion claims.
- [x] Review the whole change with a fresh reviewer using the preserved Native execution workflow; fix findings with regression evidence and rerun affected/full required checks.
- [x] Produce screenshots at handheld/Deck and larger viewport sizes; compare the stock and new view at equal viewport sizes. Distinguish fixture tests from native device evidence.
- [x] Remove the temporary Ally session trial before candidate reload; preserve a verified frontend backup and baseline digest. Installation occurs only with authorization for the concrete candidate. Wait for the delayed Home remount before testing.
- [x] Revisit the full current native category inventory and compare native counts/order/reachability before and after. Check representative System, Display, Audio, Storage, Notifications, Downloads and Game Recording pages, first/last sidebar entries, footer-safe scrolling, dynamic content, popups, and route/unload cleanup. Avoid exporting personal data or changing system settings during navigation checks.
- [x] Deliberate slider/device writes, physical controller/touch comfort, Steam Deck device installation and performance acceptance are separate controlled checks. Record what was actually exercised; do not claim full acceptance from structural snapshots or browser fixtures.
- [x] Record installed commit/digest/backup if installation is authorized; otherwise leave a tested local candidate ready for review. No push, PR, release or publication.

Task 5 completion is the authorized local-candidate path: no persistent installation occurred. Backup/reload/installed acceptance steps remain conditional on installation authorization, as detailed in `docs/validation/native-settings-vdl.md`. Source-only native checks and restoration of the temporary preview are explicitly distinguished there.

## Plan self-review

The shared shell covers all 25 observed categories without requiring each to match Audio. Complex layouts deliberately keep native geometry. Each review-focus class has an owning task and tests. Account/async-art and cleanup failures have explicit tests. Backdrop and activation choices are stated above for review; live gameplay capture is explicitly excluded rather than silently represented by static imagery. Installation and unperformed device acceptance remain separately reported.
