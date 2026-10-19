# Game Glance floating menu: implementation proposal

Date: 2026-10-19. Status: scope approved for implementation planning; production implementation has not started.

## Purpose and success criteria

Provide one Game Glance menu for the Ally's Steam/Home and Quick Access buttons, usable over Home and a running game. Preserve Steam's setting behavior, controller focus, confirmations, and access to native screens. The accepted mock is the visual reference; simulated controls and data must become real bindings or clearly labeled native handoffs.

The first functional version succeeds when both buttons open the floating menu, LB/RB changes sections, A selects, B unwinds one level and then closes, game input returns after closing, settings reflect authoritative Steam state, and native handoffs work. Disabling or unloading the feature must restore native menus without a Steam restart.

This proposal covers the first functional version and its validation boundaries. It does not approve a release or claim compatibility across all Steam builds or devices.

## Evidence and limits

The investigation used the user's Bazzite Ally with Ori and the Will of the Wisps (1057090). Findings are build-specific and require runtime capability discovery.

| Area | Evidence |
|---|---|
| Menu opening | Main and Quick Access calls reach a replaceable `OpenSideMenu` prototype method. Bound `OpenQuickAccessMenu` cannot be replaced safely on the instance. |
| Controller interaction | Disposable probe used Steam's existing MainMenu window. User confirmed navigation, both buttons, game input after closing, and native handoffs. Retained logs independently confirm navigation and reopen/close requests; handoff success is user-reported. |
| Achievements | Full catalog, unlock state, progress, images, and global completion percentages returned successfully. |
| Guides | Popular/favorite lists, metadata, and article sections returned successfully. Rich article rendering has not been validated. |
| Controller overview | Active metadata and an already loaded layout's action sets, modes, and bindings were readable. Independent cold loading/freeing remains a validation gate. |
| Setting writes | Volume, brightness, and client frame-limit target accepted small changes, reported them back, and restored to their original values. This does not measure effective gameplay frame rate or external-display brightness. |
| Profile scope | Native UI and stores confirmed default profile 769 while game 1057090 was running. New client-setting persistence across games remains unverified. |

Detailed companion evidence is in this chat's `menu-routing-audit.md` and `setting-readback-results.json`. The mock and disposable probe are references, not production code to copy wholesale.

## Chosen approach

Use a Game Glance React menu within Steam's existing menu-window and controller-navigation context. Keep Steam responsible for window activation and input ownership. A coordinator translates supported menu-opening intent into one custom menu and suspends it during native handoffs.

Alternatives considered:

- A separate overlay over the main browser was useful for scale testing, but acquiring and releasing gameplay focus independently adds lifecycle risk.
- Restyling every native panel preserves its data bindings but tightly couples the design to unrelated internal layouts and cannot reliably provide the accepted merged structure.

The native-host approach best matches the successful probe. Production will use Steam/Decky navigation primitives and guarded render integration, not the probe's global manual event routing or CSS hiding of native root elements. If host discovery fails, retain native menus.

## Product behavior

### Bar, appearance, and configuration

- A centered floating bar with a separate frosted-glass content panel. Use Game Glance's existing artwork/accent pipeline and fixed Steam blue `#1a9fff` when no game accent is available.
- Retain the tested scale with an initial approximately 3% increase for another Ally review. Use soft rounded focus treatment following each control; retain visible focus without an additional rectangular frame.
- Persist 1–4 unique pinned sections. Defaults: Navigate, Quick settings, Performance, Social. More is always present. Hidden sections remain in More.
- A running game adds the first In game section outside that allowance. It disappears on exit. Pin allowance stays four even when no game is running.
- Configure menu lives in More. Its switches immediately update the bar; prevent removing the final pinned section or adding a fifth.
- Help and Soundtrack are optional pinned sections and otherwise appear under More. Plugins defaults to More.
- The notification count sits left of its bell. It reflects Steam's unviewed count, not tray-item count; omit the number when zero.
- Friend status colors retain Game Glance's existing mappings. Artwork tint must not recolor presence status.

At narrow widths, stack panel columns and wrap controls without clipping. The Ally layout remains the primary device target. Do not add a separate user scale setting for this feature.

### Opening and navigation

- On a fresh Home-button open, show In game when a game is running; otherwise Navigate. Quick Access opens Quick settings, even if it is hidden from the bar; More is then selected and B returns to More before closing.
- A repeated opening-button press closes the current custom menu. Pressing the other opening button selects that button's entry section. Preserve native debounce and controller-configurator return behavior.
- LB/RB traverses only visible bar sections, including In game and More. Preserve per-section last focused control while the menu session remains alive.
- B closes the deepest local view first: article/detail, plugin settings subsection, confirmation, section, then the menu. Returning from a native view follows that view's own Back behavior; a later menu-button request reopens the appropriate custom entry.
- Restore focus to the game or originating Steam view after closing. Text entry and native modals receive input exclusively while active. Do not consume system chords, global shortcuts, or controls while the custom tree is inactive.
- A controller disconnect or section disappearing must move focus to a valid remaining control or close safely.

### Section scope for the first functional version

| Surface | Custom content and real behavior | Native fallback / boundary |
|---|---|---|
| Navigate | Accepted 3×2 grid: Library, Store, Downloads, Settings, Profile, Power. Profile uses Steam's current-user URL resolver and feature/offline gates. | Use existing Steam/Decky entry actions. Power retains native confirmation and availability. |
| Quick settings | Volume and brightness sliders. Wi-Fi/Bluetooth side by side as switches. Other contains verified, available switches such as Airplane mode, Night mode, automatic UI scaling, and Friends & Chat DND. | Network pairing/device details, microphone settings, and unsupported advanced settings open native Quick Settings. Omit unsupported adaptive-brightness controls. No pairing workflow is recreated. |
| Performance | Its own tab with General, Display, Power & GPU, Overlay subsections. Three-part Performance Profile pill: low-power, balanced, performance. Frame Limit, Disable limit next to VRR, then remaining supported toggles. | Follow native capabilities, deferred/disabled rules, profile identity, and per-control binding family. Reset uses the native workflow until its scope and effect pass validation. Native Performance remains available. |
| Social | Existing live friends data in the accepted 30/70 layout; selected friend's identity/status and a clear Open chat in Steam action in the right pane. | Initial chat uses native handoff. No fake conversation or disabled composer. Embedded history/sending is a separate later milestone. |
| Plugins | Plugin list and an adapted Game Glance settings view using existing handlers and persisted values. | Other plugins open in native Decky initially. Do not infer that arbitrary `plugin.content` can be mounted independently. |
| Notifications | Live bell/count; selecting it opens native notifications initially. | Preserve native viewed/read/type-specific actions. No custom Clear all action in the first version. |
| Help / Soundtrack | Real entries using native Help and Soundtracks panels. | Custom soundtrack playback and Help workflows are deferred. No simulated player is shipped. |
| In game | Live running-game identity and available native actions. Custom achievements and guide list. Controller overview uses a guarded reader after its loading lifecycle passes validation. | Guide articles open natively initially. Full controller editing, game details, Notes, Recording, Resume, and Exit use native actions/context. If overview reading fails, open the native overview. |

DND means the Friends & Chat preference. The visible label or supporting copy must make that scope clear. Inactive/unavailable controls must not appear to change settings locally.

Achievement cards conceal locked hidden entries until explicitly revealed. Guide list supports real favorites/empty states, paging, thumbnails and ratings; voting/favoriting writes are not part of the first version. Resolve guide author names through native persona data; use a neutral unavailable-author state if lookup fails.

## Integration architecture

The following are proposed boundaries, not scaffolding already created:

| Boundary | Responsibility |
|---|---|
| `src/menu/model.ts` | Stable section IDs, pin validation/migration, local history, menu state, focus identifiers. No Steam calls. |
| `src/menu/coordinator.ts` | Open, close, handoff, return, disable, failure, unload; owns the session and coordinates host/adapter cleanup. |
| `src/menu/host.tsx` | Guarded native-window/render integration, native focus-tree ownership, contexts, modal/keyboard coordination, error boundary. |
| `src/menu/steam/` | Capability discovery and small routing, settings, running-game, achievements, guides, controller, notifications adapters. Keep internal Steam shapes out of presentational components. |
| `src/menu/components/` | Shell, bar and individual panels, consuming adapter snapshots and commands. |
| Existing settings/backend KV | Persist feature enablement and pin choices using the existing Game Glance pattern. Reuse existing plugin settings operations. |
| Existing plugin lifecycle | Start/stop menu independently alongside Home/game-page/screensaver features. One cleanup failure must not skip the remaining cleanup steps. |

Use stable IDs such as `navigate`, `quick-settings`, `performance`, `social`, `plugins`, `help`, `soundtrack`. Never persist translated labels, numeric mock indices, Steam objects, DOM nodes, chat data, or profile copies. Five-item old mock selections migrate by retaining the first four valid unique choices; invalid/empty stored data uses defaults. Production settings use a schema version.

The new menu has its own optional setting, default off. It follows Game Glance's master disable behavior but does not require Spotlight Home to be enabled. Load settings before activating interception. Leave existing Home, game-page, and screensaver integration independent.

### Menu coordination and native handoff

Model states explicitly: disabled, closed, custom-open, native-handoff, failed. Only custom-open owns custom controller input. Native-handoff retains a return descriptor but does not keep a hidden custom tree active.

Preserve the original Home/Quick Access handlers, including keyboard dismissal, debounce, button enablement and configurator route restoration. Track owned opening intent around their dispatch so unrelated programmatic Steam/Decky requests continue to work natively. A rendering/navigation activation must not be mistaken for a second hardware toggle.

Use the proven writable common dispatch seam only with instance filtering and capability checks. Respect VR exclusions and menu suppression. Tab-selection-only QAM requests must remain selection-only. Explicit native actions enter a scoped bypass, deactivate the custom tree, and use the original entry path. Unknown native requests delegate to Steam. Do not replace a non-writable bound method or suppress all native opens globally.

A successful native host mount is required before committing to custom presentation. On failure, close/unmount partial custom content and replay the original native opening request. Hook cleanup restores only patches still owned by this installation, so it cannot overwrite a newer plugin's patch.

### Routing and game context

Select running-game context from Steam's running-app/window state, not just the foreground app ID; an open menu may identify Steam 769 as foreground. The initial policy follows Steam's main running app, and uses native UI for ambiguous/multiple-app selection. Streamed/non-Steam games use their native capability/action list. Never show actions solely because Ori exposed them during research.

Overlay routes for Achievements, Guides, Controller, Notes, and Recording use native builders and their game-controls navigation history/focused-column context. They must not be pushed blindly into the main browser history. Full controller editing has its dedicated navigator entry. Resume invokes Steam's app action and closes side menus. Exit keeps local/streamed distinctions and native confirmation; never bind a custom Exit button directly to termination.

### Settings and data contracts

Each settings adapter returns an immutable snapshot with availability, authoritative value, bounds/options, scope information when known, pending state, and error; it provides a command and subscription cleanup. Unknown scope is not labeled per-game.

- Resolve active output device and audio volume enum; subscribe to device changes. Percentage conversion follows native bounds. Brightness uses its callback-fed value and supported display behavior.
- Resolve TDP/GPU limits and profile options from the current platform service. Observed 4–20 W and 200–1800 MHz are evidence, not constants.
- Keep new client settings distinct from legacy profile-aware performance messages. Reuse Steam's Use per-game profile control and scope display. Do not store a parallel profile database or infer persistence from opaque config keys.
- Coalesce rapid slider input using native-equivalent timing and serialize writes where required. Drop obsolete queued values after context/device changes. Resolve completion from native readback, including clamped values; a stale completion must not overwrite a newer value or context.
- On failed/timed-out writes, retain the last authoritative value, clear pending state, and show a concise local error with native access. Never show success based only on an optimistic local assignment.
- Subscription/cache keys include the relevant app, device/display, account and scope. Discard stale responses after closing, account changes, game exit or controller changes.
- Achievement/guide loading is lazy and bounded. No article-body prefetch, all-friends chat creation, or arbitrary plugin mounting while the menu is closed.
- Controller selection follows the current valid active controller. Configuration handles are distinct from controller indices. Cold loading, decoding, ownership and freeing must pass tests before enabling a custom overview; otherwise use native UI.

Notification viewing has side effects distinct from read/dismiss/delete. Initial native handoff owns those effects. Never substitute toast clearing for notification-tray actions.

## Failure and compatibility behavior

Missing native exports, unknown render shapes, missing settings, failed subscriptions or unsupported Steam modes leave the relevant native access intact. Avoid hardcoded bundle module IDs; discover export shapes/signatures and validate before use. Warn once per failure category rather than every render.

Disable/unload closes custom content, cancels pending local work, unregisters all subscriptions/listeners, releases owned focus/window/configuration resources, removes render integration, and restores owned hooks. Canceling UI work must not abandon an already-issued settings write without handling its eventual readback. Do not restore old user setting values on normal close/unload.

A persistent Open Steam menu action is available from More and the Game Glance settings view. Native access must remain possible after a failed mount, exception, or feature disable. No hidden test-only button combination is a production recovery requirement.

## Staged validation and completion gates

1. **Host and lifecycle:** implement the shell behind its default-off setting. Verify both buttons at Home and in game, repeated/alternating presses, LB/RB, A/B, touch/mouse coexistence, keyboard and modal focus, game input after close, native bypass, disable, Decky reload and exception cleanup. Unknown host shape must open native menus. This stage precedes wiring advanced settings.
2. **Core destinations and settings:** wire Navigate, quick settings, available performance controls, pins and native fallbacks. Test each new setter with reversible readback on the Ally; representative earlier tests do not validate all setters. Confirm latest-value behavior and context changes. Preserve network access during any network-toggle test.
3. **Game data and plugin settings:** wire live game actions, achievements, guide list, guarded controller overview, and reused Game Glance settings. Verify empty/offline/error cases, hidden achievements, stale game responses, controller disconnect and native Back behavior.
4. **Visual acceptance and packaging:** review scale/focus/glass on the Ally, including no game, game running and Steam-blue fallback. Run typecheck and the repository test suite before packaging; verify ZIP contents. A test package is not a published release.

Unit tests focus on menu/history transitions, pin migration, intent versus native bypass, hook ownership/cleanup, capability and scope mapping, write ordering/readback, stale responses and failed mounts. Adapter tests use meaningful fake native contracts; avoid snapshots that only mirror markup. Native-host correctness requires device tests in addition to unit tests.

Device results must distinguish direct telemetry, user feedback, source inspection and untested assumptions. Suspend/resume, display/controller changes and reload while open are required before calling the feature generally reliable. Profile persistence across games/restarts is a separate acceptance claim requiring explicit tests and a restoration plan.

## Deferred work

Embedded Social history/composer/sending, generic Decky plugin embedding, rich guide article rendering, custom notification actions/Clear all, custom soundtrack playback, broader hardware/Steam-build coverage, and additional profile-management features are later milestones. Their entry actions remain functional through native handoffs.

## Review boundary

Approval of this document approves the first functional scope and the stated native fallbacks. The next deliverable is the task-level implementation plan with files, tests and execution method. Production edits, device installation and publication are separate steps; no code or release is created by approving this proposal alone.
