# Floating menu — first device gate

Status: **host repaired; acceptance still in progress**. The custom menu renders and the user reports that controller navigation works quite well. In-game input, keyboard/modal, held-button, and controller-configurator acceptance are not yet confirmed; Tasks 5–9 remain gated.

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

## Restoration after the first failed attempt

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


## Host repair checkpoint · 2026-10-19

The earlier export-mutation failure is resolved. A reversible live probe confirmed Steam calls the shared portal API on native menu renders even when React has cached its memo component. The host now owns a narrowly filtered portal hook: only a recognized `MainNavMenuContainer` function targeting its own `MainMenu` popup is wrapped. Unrelated portals pass through unchanged. Cleanup uses the existing ownership-aware descriptor restoration.

Steam retains the portal target, owner-window providers, native navigation component, activation/deactivation callbacks, and native keyboard/modal routing. The native surface is activated after presentation begins so its first render can occur; presentation still requires layout acknowledgement and falls back on failure. The viewport rule is temporary and targets the uniquely discovered native Main Menu placeholder in its owning Steam window. It does not hide native roots or modify React fibers. Stylesheet discovery uses the module contract, not individual export discovery.

Verified live on the Ally:

- Custom root appears, with the first content action receiving focus.
- Native viewport expands from 241 × 845 to 1500 × 845 CSS pixels. The floating content bounds were approximately x=195, y=68, width=1111, height=577.
- The user reports: “Seems to work quite well” after the requested controller navigation test. Treat this as general user feedback, not proof of every acceptance item.
- The custom Open in Steam action shows Steam's own contents and restores the 241-pixel viewport. Home reopens the custom menu.
- More → Plugins → Open in Steam enters native Decky (side menu 2, tab 999); the custom viewport rule is removed.
- Disabling the menu switch during native handoff restores the original Home handler, Quick Access handler, and portal descriptor. Re-enabling reacquires them.
- Disabling the existing master switch during native handoff likewise restores all three; the original enabled master value was immediately restored.
- Reload works with the feature enabled. Decky can retain an old active plugin panel after reload. That old menu-settings panel now warns that it must be reopened and disables its stale toggle. Closing/reopening Game Glance shows the active settings with no warning.
- Existing Home reload remounting navigates after 1.5 seconds, so reload checks reopen the settings only after that transition completes.

Current test package matches the device copy: SHA-256 `9845b221e5ee8b0cf9d139745fc5d5f3df9c26bee16bae417bd66ff11d15f14c`. TypeScript and 1,444 tests pass; package integrity passes. Native activation failure additionally has a regression for cleanup rejecting an in-flight presentation without an unhandled rejection.

The preview remains installed and enabled for the pending in-game acceptance check. The original frontend backup remains unchanged at `/tmp/gg-floating-task4-original-index.js`. Restore the original frontend and native menus when the acceptance run ends. No Git remote operations or release publication occurred.
