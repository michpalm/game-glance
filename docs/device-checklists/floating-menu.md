# Floating menu — first device gate

Status: **not passed**. Tasks 5–9 must wait for a working native host and a new device run, or explicit review of this limitation.

## Local checkpoint · 2026-10-19

- Branch: `codex/floating-menu`; isolated local worktree. No Git remote operations or publication.
- Default-off menu preferences, shared Decky settings, master-setting startup guard, retry after failed preference loading, and independent unload cleanup are implemented.
- Menu startup waits for both master settings and menu preferences. Spotlight Home is independent.
- TypeScript passes. `pnpm test`: 126 files, 1,438 tests pass.
- `scripts/package.sh` passes; `unzip -t out/game-glance.zip` reports no errors.
- Final local ZIP SHA-256: `23efacf75c75f34d4fe533d30486617934b36f9122900aad59ef00f93279ad4d`.
- This is a development checkpoint, not a release or completed functional menu.

## Ally evidence

User explicitly authorized the device copy: “Send it to the Ally.” Only the frontend was temporarily replaced; Python/backend files were not changed. No game was running during this check.

Verified through live Steam/Decky state and DOM inspection, not physical controller testing:

1. Preview loads through Decky's normal plugin reload. Its own enable toggle renders and persists.
2. Native menu methods remain unpatched with the preview disabled.
3. Enabling installs the owned Home/Quick Access interception.
4. Invoking the actual Home handler still displays Steam's native menu; the custom content does not render.
5. Read-only inspection of the mounted component chain identifies Steam's browser component as React tag 15 (SimpleMemoComponent). React retains the previously resolved inner function. Changing the exported memo's `type` does not update the mounted renderer. Export discovery therefore does not prove an active render connection.
6. Added render acknowledgement: presentation waits for the custom native render's layout commit, with a one-second timeout. Missing acknowledgement rejects presentation so the coordinator removes owned hooks and replays the native opening request.
7. Retested guarded build with interception confirmed active before the Home request: after 1.4 seconds, the native menu was open (`GetOpenSideMenu() === 1`) and the Home handler was restored. This confirms native failure recovery, not custom rendering/navigation.

The remaining host investigation must find an integration that reaches an already-mounted native renderer without modifying React fibers or hiding native roots. Do not mark a renderer export patch as sufficient again. The generic host contract and shell remain reusable.

## Restoration

- Preview toggle explicitly switched off; UI readback `aria-checked="false"`.
- Original frontend restored from `/tmp/gg-floating-task4-original-index.js` on the Ally and reloaded through Decky.
- Original/installed frontend SHA-256: `9b35dbaba98bfd6a17d7b6c313ce2662a7da0276b3cb0e24cdeccfa235a48503`.
- Final check: original Home and Quick Access handlers; plugin loaded; menus closed.
- Preview ZIP and original frontend backup remain in the Ally's `/tmp` for traceability. No permanent test input hooks remain.

## Required acceptance run after host repair

Record each result as physical-device verified, programmatically verified, failed, or not tested. Unit tests do not establish these results.

- [ ] Home screen: Home opens Navigate; Quick Access opens Quick settings.
- [ ] Running game: Home opens In game; running-game entry is outside the four pinned sections.
- [ ] Same button closes; opposite button changes entry without unintended closing or double dispatch.
- [ ] A selects; B unwinds nested panels then closes; LB/RB traverse only the visible bar.
- [ ] Touch and mouse coexist with controller focus; scale and soft highlights feel correct.
- [ ] Held buttons do not repeat actions; keyboard/modal input has exclusive focus; system chords remain native.
- [ ] Native Steam, Decky, and controller configurator handoffs work, including return/reopen and configurator route restoration.
- [ ] Closing restores Steam/game input; no controls leak to the game while custom UI is active.
- [ ] Disabling either master or menu switch and Decky reload clean up owned resources, including during native handoff.
- [x] Failed presentation restores native opening and removes owned interception (programmatic Home check only).
- [ ] Re-enable after failure and repeat both entry paths.
- [ ] Unload/restore original frontend and confirm no custom hooks remain.
