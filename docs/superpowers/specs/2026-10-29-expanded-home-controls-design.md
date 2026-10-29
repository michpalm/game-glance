# Expanded Home controls — agreed design and phase-one scope

## Intent and approved design

Extend and complement the existing Game Glance status bar on Spotlight Home. Keep the Floating pills treatment for Menu, Select and Back, add a small Search pill revealed when focus moves up to the top controls, and let each visible status element receive its own focus/highlight. Remove the Notifications shortcut: notifications already live in the menu. The reference is the refined `home-controls.html` mockup in this chat's visualization directory.

The user explicitly requested planning now and deferred actual search implementation/behaviour. They subsequently chose **focus/highlighting first** for status items, with activation destinations to be decided later. Their eventual Search keyboard requirement remains **follow the saved Game Glance keyboard choice**; the radial keyboard in the mockup illustrates that future interaction, not phase-one implementation.

## Phase one

- Add **Expanded Home controls**, a separate explicit opt-in, default **false**, alongside the existing **Status bar** setting. Existing users keep their current status bar without automatically receiving the expansion.
- Effective only when Game Glance, Spotlight Home and Status bar are enabled and Home's native control contract is available. Retain the saved opt-in if a parent setting is temporarily disabled.
- Keep the current status data, ordering, placement, charging/low-battery colours, controller batteries, download progress, persona dot/avatar option and update cadence. Each currently visible status element gets one independently focusable/highlightable cell. Status activation has no new action in this phase and must not bubble into launching a game.
- Use Steam's existing Home/Back/Search controls and original footer prompt nodes where possible. Apply scoped Game Glance presentation; preserve original handlers, labels, glyph selection and semantics. Never draw a second button legend over the original.
- The Search launcher's appearance/focus is in scope; its existing Steam action remains unchanged. Do not create a custom input, query state, keyboard session, search request or results screen. This keeps existing search usable until the later Search phase.
- Show the compact Search/navigation controls when focus reaches the top row; hide them after returning to Home content. Keep the existing status group visible as appropriate. Up from the highest Home action row enters Search; retain existing navigation through games, tabs and feed. Left/right traverse visible controls, clamped at the ends. Down/B from the top row returns to the last valid Home action, otherwise Play, game cards, or the existing empty-Home action.
- Reuse Steam's real footer prompts and controller glyphs, including context/language/device changes. Style their existing groups as Menu on the left and Select/Back on the right; do not rewrite labels to English or hard-code Xbox A/B glyphs.
- Do not add a Notifications shortcut. While expansion is active, suppress any duplicated native status/notification controls without leaving invisible focus targets. Preserve Home/Back/Search launchers.
- Turning expansion off restores today's status-bar behaviour and Steam's navigation/footer presentation. Turning the existing Status bar off restores Steam's controls. Unload, route changes, side menus and launch transitions release all temporary ownership safely.
- Home only. Keep game pages, QAM/menu status copies, screensaver, Social and the working keyboards unchanged.

## Presentation constraints

Use existing Game Glance source-pill/status/focus tokens and the existing status placement/scale helpers. A compact Search pill uses `clamp(110px,13vw,175px)` as its preferred screen-space width with at least **20 CSS px** clear of neighbouring groups. Preserve the current status group's anchor. If the available native layout cannot fit the minimum Search width without overlap, restore native chrome rather than crop or trap controls. Focus uses the existing 2px outline/2px offset treatment; it must remain entirely visible. Preserve native footer layout measurement so existing Home content reserves enough space.

## Deferred work

Custom Search expansion into a longer editable field, saved-keyboard integration, query lifecycle, submission, filtering, results, dismissal details, search history and provider choice. Status-item activation destinations are also deferred. Phase one must not establish these behaviours accidentally.

## Native contract and acceptance gates

Original Home/Back/Search launcher nodes, original status/notification nodes and original footer prompt groups must be identified from verified Steam source/DOM evidence. Do not invent routes, minified export names, focus APIs or launcher behaviour. Preserve native Search identity and handlers. Missing or incompatible native bindings deactivate the expansion for that opening and retain today's UI; do not erase the saved preference. Invisible native focus or repeated ownership writes are failures, not acceptable fallback states.

The user is playing and has requested no further Ally access until asked/approved. Planning is local. Source/DOM inspection on the Ally, installation, reload and device tests each require appropriate explicit approval. No push, PR or release is authorised. A new frontend build will also contain the pending notification-details correction, which is local but not installed; disclose the combined scope before installation.
