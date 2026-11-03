# Status bar and footer on every page

Written 2026-11-03. Status: design approved in conversation section by section; awaiting Michael's written review. Not committed.

## Why

With Expanded Home controls on, Home shows the Game Glance status bar in place of Steam's top bar and restyles Steam's footer into Game Glance pills; our game page has the footer too. Every other Big Picture page shows Steam's own top bar and footer, so the look switches whenever you leave or return to Home. The switch is also where the remaining glitches live: Home and the game page each hold their own leases and hand them over, and on a return from another page Home's content waits ~0.5–0.8 s for its focus restore, so Steam's footer shows first (2026-11-03 Ally recordings).

Michael's goal: the same Game Glance bar and footer on every Steam page, with no visible switch when moving between pages.

## Decisions (Michael, 2026-11-03)

| Question | Decision |
|---|---|
| Which pages | Every Big Picture page: Library and its tabs, Collections, Downloads, Media, Store, Settings, profiles, friends, game pages, Home. |
| Top bar on other pages | Ours, fully working: Search pill and status cells take focus as on Home. |
| Structure | One persistent layer for the whole window (approach A), not per-page patches. |
| With a game running | Same everywhere: Steam pages over a running game get the bar and footer too. |
| Opt-in | New **On every page** toggle, default off. |

## Behaviour

### Ownership: one ChromeHost

- `ChromeHost` is mounted once in Steam's main window with `routerHook.addGlobalComponent` (as `ScreensaverHost` is). It never unmounts on navigation.
- It owns, for every page:
  - the status bar portal (today's `GameStatusBar`, unchanged visually);
  - the header lease that hides Steam's top bar (`acquireHomeHeader`, changed as described under Focus);
  - the footer lease and footer CSS (`acquireHomeFooter`, `homeFooterCss`);
  - status-cell focus and the Search pill (today's `createHomeStatusFocus` and Home Search).
- Pages only contribute:
  - Home: when its feed sheet covers the bar (today's `statusHidden`), and its own Down/B return target (Play, then recents).
  - The game page and Steam's pages: nothing.
- Removed: Home's own leases in `useHomeControls`, `usePageFooter` on the game page, and the footer-only hand-over (`handover`, `carry`, `footerHeld`, `footerShownIn`). The custom menu's holds (`holdPageStatus`, `holdPageFooter` in `src/menu/host.tsx`) target the host instead of Home.

### Steps aside (unchanged rules)

The host releases the header and footer, and our bar fades, while any of these is true:
- a side menu is open (our custom menu draws its own copy of the bar, as today);
- Steam's window is not in front;
- Steam's launch screen is up;
- Steam's screensaver is on;
- the window is disconnected or hidden.

### Scope by setting

- Requires Game Glance, Spotlight Home, Status bar and Expanded Home controls on (today's `footerOptedIn`).
- **On every page off:** the host takes over only on Home and our game page. This is today's behaviour on the new structure.
- **On every page on:** every Big Picture page, with or without a game running.
- New setting key `chromeEveryPage: boolean`, default `false`, beside `homeExpandedControls` in `src/data/settings.ts`, shown under the Status bar settings. Its saved value is kept while a parent setting is off.

### Focus

- **Hiding Steam's bar.** Steam's top bar stays mounted and keeps its focus targets. The header lease hides it with `opacity:0` and `pointer-events:none`. It no longer sets `inert`, `aria-hidden`, `tabindex=-1` or `visibility:hidden`, because a browser cannot focus an element hidden that way and Steam's navigation must still be able to land there.
- **Entering our bar.** Up at the top of any page lets Steam move focus into its own header. When focus lands there (`nativeHeaderFocused` in `steamUiState`), the host moves it in the same frame to our Search pill, or to the first visible status cell when Search is off. Steam's own navigation decides when Up reaches the header, so no page needs its own patch.
- **Inside our bar.** As on Home: Left/Right move across Search and the status cells, A on Search opens Home Search, and status cells highlight with no action.
- **Leaving.** Down or B returns focus to the element that had it before Up. If that element is gone, focus goes to Steam's header and Steam's own Down from there. On Home, the host uses Home's return target instead.
- **Pointer.** Our cells and Search respond to mouse and touch as on Home; Steam's hidden bar takes none.
- **Pages where Up never reaches Steam's header** (possibly the Store web view or Settings): our bar still shows but can't be focused with the controller there. The Ally check lists every such page; none is assumed.

### Footer on every page

- The same footer lease and CSS on every page. Verified read-only on the Ally 2026-11-03: Library's `#Footer` has the same structure as Home's (one wrapper, one flex-grow spacer, groups of glyph + label), with more groups: Menu | Filter, Sort By, Options, Select, Back. Groups after the spacer join into one segmented pill, as on Home.
- A page whose footer does not match the structure keeps Steam's footer (the lease's existing check).

### Safety (unchanged contract)

- Only marker attributes and our CSS. Steam's nodes, handlers, labels and glyphs are kept.
- Malformed or missing structures leave Steam's bar and footer as they are.
- No Steam functions are called.
- All ownership is released on unload, on the toggle going off, and under every step-aside condition.

## Testing

- Vitest, test-first:
  - the host takes the header and footer on any route when on, and only on Home and the game page when off;
  - it keeps them across a route change with no release or re-acquire;
  - it steps aside under each suspension and takes them back after;
  - focus landing in Steam's header moves to our Search pill, or to the first cell without Search;
  - Down/B returns focus to the remembered element, falls back when it's gone, and uses Home's target on Home;
  - the header lease no longer sets `inert`, `aria-hidden`, `tabindex` or `visibility`;
  - the setting chain and its default.
- Ally, by recording and by eye:
  - pages: Library and its tabs, Collections, Downloads, Media, Store, Settings, profile, friends, a game page, Home;
  - each with and without a game running;
  - recorders confirm the footer never shows Steam's look on any navigation, and that the bar never swaps;
  - Up and Down/B on every page; list pages where Up can't reach the header;
  - Michael checks by eye.

## Out of scope

- New status-cell actions (the cells stay focus-only, as on Home).
- Changing Steam's footer buttons themselves.
- The in-game menu's own copy of the bar (unchanged).

## Ships in

4.0.0 on `codex/social-chat`. Nothing pushed until Michael says.
