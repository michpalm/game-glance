# Version Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users select every installable stable release from 3.5.0 onward, with a tested route back and forward.

**Architecture:** Keep the existing daily latest-release check. Add a separately loaded, paginated release catalog and an explicit install action. Preserve unknown persisted settings so returning to 3.5 does not discard future preferences.

**Tech Stack:** TypeScript, React, Decky API/UI, Vitest, Rollup; device validation through existing CEF scripts and SSH.

**Spec:** `docs/superpowers/specs/2026-10-22-3.5.0-stability-design.md`

## Global Constraints

- Version picker floor: 3.5.0, inclusive; published stable versions only, including future major versions.
- Original release tags and ZIPs stay unchanged. No publication, tags, or release packaging in this implementation pass.
- Use an isolated branch based on the verified merged 3.4.1 main commit; carry the approved spec and plans into it, leaving existing work intact.
- Keep latest-update behavior and defaults; failures never install a different release automatically.
- Use the repository's verified public noreply commit identity. Do not copy another assistant's attribution from historical plans.
- Native execution is proposed for review; no delegation is selected yet.

## Review Focus

- Later pages fail: keep the previous complete catalog, never commit a partial refresh (Task 1).
- An older build sees future settings: ordinary setters preserve unknown fields and unsupported stored values (Task 2).
- Upgrade/downgrade direction: Decky's actual installer semantics must be verified against its installed source before wiring actions (Task 3).
- The catalog refreshes while selection is visible: keep selection by release identity; never silently install another version (Task 4).
- Returning from a future version: the picker still exists and settings survive a full round trip (Task 5).

### Task 1: Complete release catalog

**Files:** Create `src/data/releaseCatalog.ts`, `tests/data/releaseCatalog.test.ts`; consume `Release`, `pickRelease`, `isNewer` from `src/data/update.ts` and `Cache` from `src/data/cache.ts`.

**Interfaces:** Export `pickVersionCatalog(rows: unknown[]): Release[]`; export `createReleaseCatalog(fetchPage: (page: number) => Promise<unknown>, store: Cache)` returning `{ load(force?: boolean): Promise<{ releases: Release[]; stale: boolean }> }`.

- [ ] Write failing tests: catalog versions `3.4.1, 3.5.0, 3.5.2, 3.10.0, 4.0.0` yield `4.0.0, 3.10.0, 3.5.2, 3.5.0`; draft/prerelease/malformed tag/no ZIP entries are excluded, including a prerelease tag incorrectly marked stable. Duplicate normalized versions appear once with deterministic asset selection.
- [ ] Add tests for pagination: page 1 has 100 releases, page 2 contains 3.5.0; both are read. An exactly full final page requires reading the next empty page. Non-array responses and later-page failures reject a first load; after a successful load they return the last complete list with `stale: true`. Fresh complete empty lists are valid.
- [ ] Run `npx vitest run tests/data/releaseCatalog.test.ts`; confirm failures identify missing behavior.
- [ ] Implement with GitHub `/repos/michpalm/game-glance/releases?per_page=100&page=N`, numeric descending order, a catalog cache key separate from `update:latest`, 24-hour freshness and a separate retained last-complete snapshot. Never persist partial pages. Share in-flight fetches; explicit refresh makes a fresh request unless one is already running. Do not fetch historical pages during ordinary Home browsing.
- [ ] Run the focused tests and `npx tsc --noEmit`; resolve failures and commit the catalog change.

### Task 2: Preserve future settings

**Files:** Modify `src/data/settings.ts`; test `tests/data/settings.test.ts`.

**Interfaces:** Keep `createSettingsStore(kv: KvBackend)` and all current setter signatures. Add one private persistence path used by every setter; keep typed normalized state separate from retained raw settings.

- [ ] Write failing round-trip tests with `memoryKv()`: unknown top-level fields and unknown nested screensaver fields survive a known-setting change. An unknown `homeRowStyle: 'future-style'` reads as Steam but remains stored after an unrelated setter; explicitly choosing Steam replaces it. Apply the same rule to unknown screensaver enum values. Null, primitive and array payloads recover safely.
- [ ] Test consecutive setters, load followed by save/reload, and a future setting restored after simulated older-reader saves. Preserve existing setter notification behavior.
- [ ] Run `npx vitest run tests/data/settings.test.ts`; confirm new tests fail.
- [ ] Implement raw-value preservation without passing unknown values into runtime consumers. Merge only explicitly changed known fields; merge nested screensaver patches rather than replacing the whole nested object. Do not change storage schema or backend KV format.
- [ ] Run focused tests and TypeScript; commit. Document that preservation begins with 3.5 and cannot be retrofitted into an unchanged 3.4.1 ZIP.

### Task 3: Install the selected version

**Files:** Modify `src/data/update.ts`, `tests/data/update.test.ts`; create `docs/validation/3.5.0-version-switching.md` for installer evidence.

**Interfaces:** Keep `installUpdate` for the current latest-update flow. Add `installVersion(release: Release, current: string, backend?: DeckyBackendLike): Promise<boolean>` after verifying loader semantics; shared install routing may remain private.

- [ ] Read the connected device's installed Decky installer code to establish upgrade, downgrade, reinstall, cancellation and hash handling. Record source version and exact relevant code locations in the validation document. If it cannot be accessed, report this dependency; do not infer semantics solely from Game Glance's comment.
- [ ] Write failing mocked-router tests for an older selected release, a newer one, current-version no-op, missing backend, and failed invocation. Assert exact selected URL, plugin name, version, hash and the direction-specific argument verified above. Invalid current versions fail without invoking the installer.
- [ ] Run `npx vitest run tests/data/update.test.ts`; confirm failures, implement `installVersion`, rerun and typecheck. A true result means the installer invocation succeeded, not proof installation completed.
- [ ] Commit with installer evidence; preserve existing latest-update tests.

### Task 4: Version choice in Quick Access

**Files:** Create `src/components/UpdatesSection.tsx`, `src/data/useVersionCatalog.ts`; modify `src/components/SettingsPanel.tsx`; create `tests/data/useVersionCatalog.test.ts` using existing test mocks, and pure view-state tests if needed.

**Interfaces:** Move current `UpdatesSection` into its own file, exporting `UpdatesSection(): ReactElement`. Export `useVersionCatalog(enabled: boolean)` returning `{ releases: Release[]; loading: boolean; stale: boolean; error: boolean; refresh(): void }`.

- [ ] Write failing hook/controller tests for lazy loading, shared requests, complete-list fallback, stale-result suppression after unmount, and a selected release removed by refresh. A removed selection becomes unavailable and disables installation; it never resolves by array index to another release.
- [ ] Run focused tests to demonstrate failures; implement catalog loading on explicit version-picker opening. Show `Choose version`, an explicit `Install {version}` action, installed/latest labels, refresh, and a clear refresh error while retaining cached choices. Selecting an option alone never installs it. Disable installation for the current version and during a pending installer call.
- [ ] Preserve `Check for updates` and the latest-update action. Route installs through Task 3 and Decky's confirmation. Restore sensible focus after refresh/failure; show a toast when the invocation cannot start.
- [ ] Run tests, TypeScript and build; inspect the real Quick Access UI with controller input. Commit the UI with checklist additions.

### Task 5: Round trip and release gate

**Files:** Update `docs/validation/3.5.0-version-switching.md`, `docs/device-checklist.md`, `docs/features.md`.

- [ ] Run `npx vitest run`, `npx tsc --noEmit`, `npm run -s build`; require zero failing tests, clean typecheck and successful build. If backend behavior changed, run `.venv/bin/pytest -q` too.
- [ ] With user-authorized test artifacts, validate 3.5 to a future test build, back to 3.5, and forward again. Record installed versions after reload, settings snapshots, cancellation, offline catalog reuse and unavailable asset behavior. Do not create fake public GitHub releases; local metadata fixtures can drive tests. Request device/settings changes only when necessary and authorized.
- [ ] Record which behavior was tested on Ally and Deck and which remains unverified. The version picker must be reachable after returning to 3.5. No success claim from the installer-call boolean alone.
- [ ] Review the diff for regressions, commit documentation, and report readiness separately from publication.
