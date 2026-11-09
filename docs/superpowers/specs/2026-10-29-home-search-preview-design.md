# Home Search preview and complete header replacement

Status: approved by the user (“yes, continue”); implementation plan prepared for review. Follows the approved Floating pills mockup and the user's clarified Search reveal/keyboard behaviour. Supersedes the footer/status-only header and Search exclusions in the earlier Expanded Home controls spec for this next phase. Search queries and results remain deferred.

## User intent

On Spotlight Home, opt-in Expanded Home controls should fully replace Steam's visible and focusable top bar. Our existing status pill remains visible. Search is a small clickable pill which appears only when the user moves upward from Home content into the top controls. Activating it enters search mode, expands the field and opens the saved Game Glance keyboard. Returning to content hides Search again. Steam's native header must not reappear merely because focus moved upward.

The user has already chosen the Floating pills design, individual status focus and the saved keyboard preference. The working Social keyboards must retain their current behaviour.

## Interaction

- Browsing Home: Search is hidden and absent from pointer/controller navigation; status information remains visible as today.
- Up from the highest Home action row enters our top-control area, reveals Search and focuses it, as in the approved mockup. Stop held content-selection repeats on entry. No native-header bypass in expanded mode.
- Search and the visible status cells form one horizontal focus sequence. Left/right moves among visible controls and clamps at the ends. Existing stable-ID repair applies when status items change. Search stays visible throughout this top-control area.
- Selecting Search expands a field in the same top region, opens the existing saved Compact or Radial keyboard and shows the typed draft. No search provider, native Search invocation, navigation, filtering, results, history or query submission is connected.
- The field remains revealed while its keyboard owns input, including Radial input which need not move DOM focus. Keyboard events cannot reach Play or change Home's selected game.
- Keyboard completion ends editing and returns to the Search pill; it does not submit a query. Labels must describe completion, not sending a Social message. Radial retains its existing X Close/B Delete mapping; Compact keeps its existing cancel interaction. This change does not alter Social's Send action or glyph hints.
- From the top controls, Down or B returns to the previous valid Home action, otherwise the existing Play/recents/empty-Home fallback. Search hides when content regains focus. Touch outside editing closes the keyboard first, matching the existing keyboard convention.
- The draft survives closing/reopening the preview while Home remains mounted. It is not persisted or mixed with Social drafts and is discarded on Home unmount/account change.
- Side menus, launch transitions, route departure, hidden/background Home, feature/parent setting off, or saved keyboard mode changes close editing and release its input ownership. Suspension must not steal focus back from the new owner or reopen editing on resume.

## Native ownership

While expanded Home controls are available and Home owns the screen, suppress the verified native top bar visually and remove its descendants from pointer/controller navigation. Opacity alone is insufficient. Own and reversibly restore prior attributes; do not remove native DOM or alter handlers. Remount/unload/setting-off must restore the original native header exactly. Outside Home retain current header/status behaviour, including game pages and menu copies.

The existing native footer prompts remain the source of translated/context-sensitive labels, glyphs and handlers. Its full-width background, backdrop blur and visible border must disappear; only our floating pill surfaces remain. Keep the footer's measured layout reserve and node identity. The subsequent footer correction `b64698d` already removes blur and border appearance locally and has not been installed.

If a verified native-header contract cannot be established, do not create an inaccessible invisible focus surface: fall back to today's native handoff and current read-only status presentation for that opening. Preserve the saved opt-in. This fallback must be explicit in diagnostics.

## Presentation

Reuse the approved `home-controls.html` Floating pills treatment: compact Search with a magnifying-glass icon and label, selected white outline; activation grows it into the longer draft field. Use current source-pill/focus tokens and scale helpers, adapting its position/width to the actual free space before the status pill. At829×467,1280×800 and1500×845 neither the field nor its outline may overlap status cells or clip. Keep the field legible above the keyboard. Search is not shown by pointer hover, routine status updates or menu return alone.

This phase adds no new Home/Back shortcuts or status activation destinations. Footer prompt styling is retained, and the expansion setting stays off by default.

## Keyboard integration boundary

Both keyboard implementations currently discover `.gg-menu`; Radial cleanup also explicitly restores Social compose focus, and presentation uses Social Send wording. Add a small explicit optional host/context interface so Home can supply its own host, placement bounds, completion label/action, input ownership and focus-return target. Preserve current Social defaults. Share existing typing/layout/feed/session code; do not duplicate either keyboard, fake a Social menu root on Home, or create a second controller feed.

Read the saved Compact/Radial choice through the existing preferences store without requiring the menu itself to be enabled/open. A Radial capability failure falls back to Compact for this opening, retaining the saved preference and showing a concise availability message. Keyboard-only styles can be shared without importing Social layout rules or changing the Social DOM.

## Verification and delivery

Use failing regression tests before implementation for Search reveal/lifetime/navigation, isolated drafts, completion versus Social Send, reversible header ownership, native remounts, setting-off and suspension, keyboard host defaults/fallback and event suppression. Add a mounted integration test where the existing test environment can support it; do not substitute source-pattern assertions for lifecycle behaviour. Keep the no-new-baseline-polling constraint; reuse observed runtime state rather than adding another always-on timer.

Use actual production presentation in local browser checks, with the Ally's native footer blur/border represented in fixtures. Check all three target sizes, long labels, changing status cells and both keyboard layouts. Run tests, typecheck, build and a fresh independent whole-change review. Clearly distinguish browser/mocked checks from actual Steam/controller validation.

No installation, reload, push, PR, merge or release is authorised by this design. Device access and any later installation follow the user's existing explicit-approval rules. No game launch, chat send or native query submission is needed for acceptance.
