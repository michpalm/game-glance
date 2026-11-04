# Library Search — centered overlay (C)

Written 2026-11-04. Product direction and interaction approved by Michael ("Let's go with C", then "Sounds good"). Written spec approved by Michael ("looks good") on 2026-11-04; implementation plan prepared for review. Intended release: 4.0.0 on `release/4.0`.

## Intent and scope

Find a game in the current user's library and open its game page without leaving Game Glance's visual language. Search covers installed and uninstalled library games and registered non-Steam entries. Steam's Store remains the place for Store search.

Reuse the existing Search entry, shared chrome host and saved Compact/Radial keyboard. Results update while typing; completing keyboard input moves into browsing results rather than submitting a remote search.

No Store provider, search history, filters, direct launching, new keyboard, new setting, or separate full-page results route is included. Existing parent settings and the On every page setting continue to govern where Search is available. This work does not fix the separately documented Store-page chrome visibility issue.

## Approved visual direction

Reference: direction C in the four Search mockups, created over an actual Ally frame captured on 2026-11-04. The mockup's results and installed labels are illustrative, not a library inventory.

- Editable comparison: `/Users/micpaal/.codex/visualizations/2026/11/04/01a1a878-2b7b-7ee2-aa8e-1cb733fcdae5/search-paths/index.html`
- Typing: adjacent `c-typing.png`; browsing: adjacent `c-browse.png`.
- VDL: `docs/superpowers/specs/2026-10-20-visual-language-design.md`, especially Sections 6 and 7.

Activating the existing Search control opens one centered glass surface. The field moves into the top of this surface; there is only one visible field and one query. Below it, a header reads **Library matches** and reports the total matching count (singular **1 game**, otherwise **N games**). Rows contain a small portrait capsule, title, optional edition information already available in library metadata, and installation status. Do not invent an edition parser or fetch descriptions to populate rows.

Use the shared VDL tokens: .40 glass and 16 px frost with its existing calm treatment, soft card corners, the shared edge, white focus ring, and 90% secondary labels with their text shadow. Focus and selection remain distinct; the accent does not become a large focus fill. Rows stay level without a lift or glow, matching the compact menu list grammar. Preserve the page's selected game and artwork underneath the overlay.

The reference overlay is 750 logical px wide at the 1280 px mockup viewport. Fit it within the actual viewport using existing scale conventions, with at least 24 logical px side clearance. Fit the field, count and scrolling list above the active keyboard. Compact and Radial need separate measured free-space bounds, not a Radial-only fixed height. Keep at least one complete result row visible at the smallest supported viewport; scroll the remaining results within the list. When the keyboard closes, the list may use the freed height. Its top, field and current row must remain steady.

Background content is visually subdued and cannot receive pointer or controller activation while Search is open. The status bar remains visible, but the overlay owns interaction until dismissed. Honor reduced motion; avoid per-keystroke entry animations and do not reload or switch the underlying hero.

## Entry, typing and results

1. The current Search reveal and top-control navigation remain unchanged. Activating Search opens the overlay and the saved keyboard.
2. An empty or punctuation/whitespace-only query shows **Search your library.** and no result rows or count. Do not substitute recent games or history.
3. Typing updates local matches immediately. Results do not steal focus or controller input from the keyboard. The result count changes without moving the field or header.
4. The keyboard completion action is labelled **Results**. With matches, completion closes the keyboard and focuses the first result. With no matches or an empty query, it closes the keyboard and returns focus to the field inside the overlay.
5. Radial **X Close** closes only the keyboard and focuses the field, preserving the query. Radial **B Delete** remains deletion while typing; it does not dismiss Search. Compact retains its existing cancel behavior, closing only its keyboard and returning to the field. A physical keyboard's Enter uses the same Results action.
6. The Radial D-pad remains text-cursor movement while typing. Only after typing ends do directions move focus through results. Pointer selection of a visible result is allowed and must consume the event without activating the page beneath.
7. In results, Up/Down moves through rows; Up from the first row reaches the field. Focused rows scroll into view with clearance, without scrolling the underlying page. Reaching an end does not wrap. A on a row opens that game's page. A on the field reopens the saved keyboard.
8. Back from results returns to the field without reopening the keyboard. Back from the field dismisses the overlay and restores the previously focused page control, with the existing chrome return fallback if that control no longer exists. The first outside tap while typing closes only the keyboard; a subsequent outside tap dismisses Search and is consumed.

Opening a result navigates to its existing `/library/app/<appid>` game page; it never launches or installs the game. Keep Steam's existing access restrictions. Do not invoke Home's hero-morph transition from arbitrary pages: the current `openGame` flow performs Home-specific work. Use the existing native navigation boundary and a simple overlay close, with no fabricated Home transition. Failed navigation keeps the query and a usable overlay with **Couldn't open this game. Try again.**; successful navigation closes Search without stealing focus back.

## Library source and matching

Build a local index from the current account's authoritative Steam library membership. `appStore.allApps` is an existing discovery surface, but a cached app overview alone is not evidence of library membership. The adapter must establish the library collection/membership contract with read-only Steam inspection before connecting it; fixtures must distinguish owned/available library entries from unrelated cached app records.

Include library games, library demos and registered shortcuts, including entries supplied through Heroic and Unifideck. Exclude native tool, DLC and soundtrack app types. Non-Steam shortcuts are searchable by their Steam library title without launching them or inspecting executables. Respect Steam's hidden state via the existing `collectionStore.BIsHidden` boundary: hidden entries do not appear. If library membership or hidden-state filtering is unavailable, show the unavailable state instead of exposing unfiltered cached records. Deduplicate by app ID; distinct app IDs with identical names remain distinct results.

Normalize query and title consistently: Unicode decomposition, remove combining accent marks, lowercase, replace punctuation with spaces, collapse whitespace and trim. Require every query token to occur in the normalized title. Rank matches in this order:

1. Exact normalized full title.
2. Normalized full title starts with the complete normalized query.
3. Every query token matches the start of a title word.
4. Other titles containing every query token.

Within a tier, sort by normalized display title, then numeric app ID. Installed state does not override relevance. No typo correction, transliteration, acronym expansion or remote query is included. For example, `ori blind` matches `Ori and the Blind Forest`, and `pokemon` matches an accented `Pokémon` title.

Preserve a focused result by app ID across index or metadata changes; do not move it because artwork or install state arrived. If the focused entry disappears, focus the next row at the same position, otherwise the preceding row, otherwise the field. Query edits during typing reset the eventual Results entry target to the first match.

Index title/membership data once per opening and refresh on available library/account notifications. Do not add an always-on library scan or polling timer. Matching must not fetch network data or request per-game details. If the library has not finished loading, show **Loading library…** and update from the library-ready signal; missing or failed capability shows **Library unavailable. Try again.** with a Retry action. A successful empty library is different from an unavailable source. A nonempty query with no matches shows **No games found**.

Reuse existing artwork resolution and fallbacks, loading only visible rows and a small scroll overscan. An artwork failure leaves a neutral capsule placeholder and readable title. Use **Installed** or **Not installed** only when known; omit the label when unknown. In particular, a Unifideck shortcut's Steam installed flag is not authoritative: reuse `unifideckInstalled` for visible matches, guard late responses by account/session, and do not scan the entire shortcut library through backend calls.

## Ownership and lifetime

Extend the chrome-owned Search session instead of mounting a second global search service. Model field, typing and results focus explicitly. While typing, the shared keyboard is the only controller input owner. While browsing, Search owns result navigation and prevents keys, gestures and pointer events reaching the background page.

Keep the draft, result scroll position and focused app ID in memory for ordinary dismissal/reopening while the same chrome host and account remain active. Do not persist them to settings or disk. Clear them on account change and chrome-host disposal, and never display the previous account's results during an account handoff.

Side menus, launch transitions, route departures, screensaver activation, feature disable and loss of Search's usable host close the keyboard and overlay, release all handlers and observers, and do not restore focus over the new owner. Preserve the in-memory draft for the same account, but never reopen Search automatically on resume or when returning from a game page. A saved keyboard-mode change closes typing and returns to the field only if the Search overlay still owns the screen; otherwise follow suspension cleanup. Discard stale asynchronous artwork/installation responses after disposal or account change.

Reuse the actual Steam main-window owner document supplied by `ChromeHost`. Do not assume the plugin's global `document` is the page document. Cleanup restores pointer, controller and native header/footer behavior through existing ownership boundaries.

## Implementation boundaries

- `src/chrome/ChromeHost.tsx` / `useChrome.ts`: keep the single shared Search owner and integrate overlay ownership with top-control focus and suspension.
- `src/home/homeSearch.ts`: extend the existing state model for open field, editing and browsing; separate keyboard completion from keyboard-only dismissal.
- `src/home/HomeSearchControl.tsx`: retain the entry control and shared keyboard integration, extracting the overlay, result view and layout styles into focused Search modules rather than growing this component indefinitely.
- New Search modules: a guarded Steam-library adapter, pure normalization/ranking, an index/session controller, pure result views, and measured overlay placement. Exact file names and interfaces belong in the implementation plan.
- `src/home/artwork.ts`, `src/data/unifideckInstalled.ts`, and existing navigation: reuse their boundaries. Do not change Home selection or Social drafts to support Search.
- `src/menu/keyboard/context.ts` and shared keyboard components: pass Results wording and the completion callback through the existing context; preserve Social's Send behavior and both keyboard layouts.

No new product dependency is needed. Keep the existing 4.0 branch, package version and unrelated feature code unchanged during Search implementation.

## Verification and acceptance

Automated behavior checks must cover:

- Installed/uninstalled games, demos, shortcuts, duplicate app IDs and same-title distinct editions; exclusion of cached non-library, hidden, tool, DLC and soundtrack entries.
- Case, accents, punctuation, whitespace-only queries, multiple tokens, all ranking tiers and deterministic tie order. Retain complete Unicode titles for display.
- Empty query, no matches, loading, unavailable, Retry and artwork failure; unknown and late Unifideck install state.
- Compact, Radial and physical input; Results versus Close; no background activation; first/last-row navigation; Back/outside-tap ordering and result focus/scroll retention.
- Main-window document ownership; removed focus targets; side menus, route departure, disabled settings, keyboard-mode change and account switches; late asynchronous work cannot restore a closed overlay or previous-account data.
- Successful result-page navigation and failed navigation recovery; Search does not launch a game or invoke Home-specific morph logic.
- Social keyboard behavior remains unchanged.

Render the production overlay with both keyboard layouts at 829×467, 1280×800 and 1500×845, including long titles, no artwork, dense status cells, a long list and empty states. Check the VDL ring, glass and label contrast over both bright and dark real frames. Confirm the focused row and field remain visible and the underlying page does not scroll. Use mounted lifecycle tests rather than source-pattern checks for ownership and cleanup.

Run the existing JavaScript suite, TypeScript checking and build. Measure matching on a several-thousand-entry synthetic library; the warm local matching pass should finish within a 16 ms frame budget on the tested handheld. Record the device and actual measurements; desktop timing is not handheld evidence.

After separately authorized installation, validate controller typing, browsing, Back and game-page openings on the Ally and Steam Deck, from Home, a game page and Library where expanded chrome is enabled. Include offline use with already available library metadata and unavailable artwork. Preserve hidden-game and account isolation. Browser fixtures and automated checks do not establish device acceptance.

This spec authorizes no device installation/reload, push, PR, merge or release. It records the agreed design; implementation follows review of this written spec and the implementation plan.
