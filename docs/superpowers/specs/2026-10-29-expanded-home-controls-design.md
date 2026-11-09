# Expanded Home controls — agreed design and phase-one scope

## Intent and approved design

Extend and complement the existing Game Glance status bar on Spotlight Home. Keep the Floating pills treatment for Menu, Select and Back, add a small Search pill revealed when focus moves up to the top controls, and let each visible status element receive its own focus/highlight. Remove the Notifications shortcut: notifications already live in the menu. The reference is the refined `home-controls.html` mockup in this chat's visualization directory.

The user explicitly requested planning now and deferred actual search implementation/behaviour. They subsequently chose **focus/highlighting first** for status items, with activation destinations to be decided later. Their eventual Search keyboard requirement remains **follow the saved Game Glance keyboard choice**; the radial keyboard in the mockup illustrates that future interaction, not phase-one implementation.

## Approved scope amendment after native inspection

Steam's current Home Search is `input[type=search]`, editable, with an onChange handler that updates Steam search state. There are no native Home/Back launcher nodes in the inspected Home header. The original launcher-based plan therefore cannot be implemented as written without crossing the deferred Search boundary. The user explicitly chose **Proceed with footer and status focus**, leaving Search unchanged until its later phase.

The following phase-one requirements are binding: only footer styling and status-cell focus/highlighting ship now. Do not restyle, replace, suppress or add a Search/Home/Back/header control; do not alter the existing top-bar cover or native header navigation. The original full mockup remains the later visual direction.

## Phase one

- Add **Expanded Home controls**, a separate explicit opt-in, default **false**, alongside the existing **Status bar** setting. Existing users keep their current status bar without automatically receiving the expansion.
- Effective only when Game Glance, Spotlight Home and Status bar are enabled and Home's native control contract is available. Retain the saved opt-in if a parent setting is temporarily disabled.
- Keep the current status data, ordering, placement, charging/low-battery colours, controller batteries, download progress, persona dot/avatar option and update cadence. Each currently visible status element gets one independently focusable/highlightable cell. Status activation has no new action in this phase and must not bubble into launching a game.
- Restyle the original footer prompt nodes only; preserve their handlers, labels, glyph selection and semantics. Never draw a second button legend over the original. Search and native header presentation remain unchanged.
- Search appearance, entry, activation, expansion, query state, keyboard/session and results are all out of this phase. Keep the entire native Search/header behaviour unchanged.
- Up from the highest Home action row enters the first visible status cell (download when present, otherwise connection/controllers/battery/clock/profile in today's order). Left/right clamp within status cells. Down/B returns to the previous valid Home action, otherwise Play/recents/empty-Home action. Up from a status cell yields to Steam's current native header entry, preserving access to Search. Keep normal Home content navigation and selection memory unchanged.
- Reuse Steam's real footer prompts and controller glyphs, including context/language/device changes. Style their existing groups as Menu on the left and Select/Back on the right; do not rewrite labels to English or hard-code Xbox A/B glyphs.
- Do not add a Notifications shortcut or suppress any native header controls. Keep today’s status-bar/native-header handoff intact; there is only one Game Glance status copy.
- Turning expansion off restores today's read-only status-bar behaviour and original footer presentation. Turning the existing Status bar off restores Steam's controls. Unload, route changes, side menus and launch transitions release all temporary ownership safely.
- Home only. Keep game pages, QAM/menu status copies, screensaver, Social and the working keyboards unchanged.

## Presentation constraints

Use existing Game Glance source-pill/status/focus tokens and current status placement/scale helpers. Keep source-pill visual height32 logical px, existing 12-on-32 radius and current footer reserve. Focus uses the existing 2px outline/2px offset treatment and must remain visible. Footer groups retain original nodes/glyphs/labels and measurable layout; join adjacent right-side groups visually while keeping the left Menu group separate. If the verified footer structure is unavailable, retain today's UI and saved preference.


## Deferred work

Custom Search expansion into a longer editable field, saved-keyboard integration, query lifecycle, submission, filtering, results, dismissal details, search history and provider choice. Status-item activation destinations are also deferred. Phase one must not establish these behaviours accidentally.

## Native contract and acceptance gates

The footer is `#Footer`, a full-width absolutely positioned root, containing one flex wrapper. The wrapper has one empty flex-grow spacer and prompt groups before/after it. Each verified prompt group contains a glyph holder with an image and a label holder. Match this structure, not minified class strings or English labels. Preserve all nodes and native handlers. Unknown structure deactivates the expansion for that opening and restores today's UI without erasing the saved preference.


The user is playing and has requested no further Ally access until asked/approved. Planning is local. Source/DOM inspection on the Ally, installation, reload and device tests each require appropriate explicit approval. No push, PR or release is authorised. A new frontend build will also contain the pending notification-details correction, which is local but not installed; disclose the combined scope before installation.
