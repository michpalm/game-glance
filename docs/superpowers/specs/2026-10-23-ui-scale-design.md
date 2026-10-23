# A larger default size (#55) — design

2026-10-23. Status: implemented and checked on the Ally (19ce89b; docs/device-checklist.md). Replaces the earlier design below, which followed Steam's display scale (kept for its findings).

## Decision (with Michael, 2026-10-23)

Following Steam's display scale grew too complex: every larger scale took room from every surface, each give-way had to happen identically on Home and the game page for the open transition, and Clean look ran out of width. Instead, Game Glance gets one better default for everyone:

- A fixed growth, as large as fits with only the air above the title giving way, at most 10%: 810 ÷ 745.6 ≈ 1.086 on 16:9 and ultrawide, 800 ÷ 745.6 ≈ 1.073 on 16:10 (`home/scale.defaultGrowth`, `AIR_ONLY_MIN_HEIGHT` = stack bottom 751.6 + legend reserve 46 − air 52).
- The same growth for Home, the restyled page (baked into `--gg-d` per canvas shape), the status bar, the open transition and the screensaver; Steam's display scale is not read.
- Nothing else gives way: the title keeps two lines, the chips, the feed and Clean look's stats stay as they are.
- Kept from the earlier work: `homeStack` (the stack's shift after the air gives way), the feed's second row dropping and row 1 yielding on a short canvas, and the open transition skipping chips with no box.

---

# Earlier design: follow Steam's display scale (superseded)

2026-10-23. Status: implemented and checked on the Ally (2026-10-23, docs/device-checklist.md); the page's title follows Home's one-line slot (decided on device). Branch `feature/3.6-hero-scale-whatsnew` (after 3.5.0).

## Problem

Issue #55 (Reddit, 3.1.1): the text is too small; slightly larger cards and art would help. Steam has a display scale for this (Settings → Display), but Game Glance ignores it: Home, the restyled game page, the status bar and the open transition look the same at every Steam scale, while Steam's own interface grows. Someone who raises Steam's scale sees everything grow except Game Glance.

## Decisions (with Michael, 2026-10-23)

- No Game Glance size setting. The visual language's identity section ("the default needs no change") records this: sizing follows Steam's own accessibility choice, as Steam's words follow its language (`tr()`).
- Anchored at Steam's 100% (scale 1.0): Home and the page look exactly as today. Above it they grow with Steam's scale; below it nothing shrinks. (Michael's Ally runs 1.2, raised by him; the default is lower, so matching Steam exactly would have shrunk Home for default users.)
- When the larger size leaves too little room, parts of Home give way in a fixed order (mockup from a real Ally frame, 2026-10-23); growth stops only past the last step.

## How Steam applies its scale (spike on the Ally, 2026-10-23)

- Settings → Display scale calls `SteamClient.Window.SetGamepadUIManualDisplayScaleFactor(f)`; the value is `settingsStore.m_Settings.flCurrentDisplayScaleFactor` (`bDisplayIsUsingAutoScale` false when set by hand).
- It sets the Big Picture window's `devicePixelRatio` to `f`; the CSS size is the screen's size ÷ `f`. Root font size and CSS zoom do not change. Measured: at 1.2 the window is 1601 × 900 CSS px, at 1.5 1280 × 720.
- `homeCanvas()` fits the canvas to the CSS size, so its scale falls as `f` rises (1.111 at 1.2, 0.889 at 1.5) and Home's size on screen never changes. Steam's own 12 px legend grows from 14.4 to 18 device px between 1.2 and 1.5.
- `scale.ts`'s comment "ROG Ally 1920x1080 renders it x4/3" assumes `f` = 1; it is corrected.
- Steam's Accessibility settings also hold `accessibility_minimum_font_size` (slider 8–24, reset 0), but its slider is shown only for `settings.bIsValveEmail` and nothing in the interface reads it: setting 16 changed no text. Out of scope until Steam ships it.

## The rule

- `f = devicePixelRatio` of the window Home is drawn in (its element's `ownerDocument.defaultView`, never the plugin's 1×1 global window), read alongside its CSS size; a missing or non-finite value counts as 1.
- **Today's look** is `homeCanvas()` of the screen's real pixels (CSS size × `f`). The **growth** is `g = max(1, f)`, capped at `G_MAX` (below). Home's logical canvas is today's canvas ÷ `g` (Ally 16:9: 1440 × 810 → 1200 × 675 at 1.2; Deck 16:10: 1280 × 800 → 1067 × 667), and its scale to the window's CSS px is `todayScale × g ÷ f`.
- The game page's `d` unit (`themeCss.pageDUnit`), the status bar, the source pill, the open transition (`openMotion`, `openTargets`) and the screensaver's canvas all take the same function, so Home and the page stay equal and the hand-over seamless.
- At `f` ≤ 1 (the Deck's default, any screen at 100%) the output equals today's for every caller.

## Giving way

A pure `giveWay(logicalHeight, legendReserve)` returns how much of each step applies, in this order, each only as far as the room requires:

1. **Air above the title** shrinks from `TITLE_BLOCK.top` 118 to Steam's top bar (52) plus 14: up to 52 px.
2. **The title slot** goes from two lines to one (58 px). The logo is drawn to the one-line height; a title too long for one line shrinks its type to fit (never cut).
3. **Gaps** in the title block (`TITLE_BLOCK.gap` 18 → 12, the actions margin 8 → 4) and between the action row and the games row: up to 25 px.
4. **The stats chips** (play time, achievements, HowLongToBeat) hide: 87 px (the chip row and its gap).

Never giving way: the games row, the action row, the store pill, the tab strip, Steam's legend reserve. `G_MAX` is the growth at which all four steps are used and the stack still ends `tabClearance` above the legend: the four steps free 222 px, so Home needs at least about 576 logical px of height, which is a growth of about 1.41 on 16:9 (810 ÷ 576) and 1.39 on 16:10 (800 ÷ 576); computed from the layout constants, not hard-coded; `stackShift()` keeps its job of moving the stack into any slack left.

The raised feed keeps its own fit (`feedSpace`, `feedRows`: the second row drops when there is no room).

## Not changed

Fill/Fit hero framing, colours, motion, the 1.1.1 page look (Spotlight Home off), Quick Access.

## Testing

- Unit: `homeCanvas` with `f` = 1, 1.2, 1.5, 2 and missing (16:9, 16:10, 21:9), output identical to today at `f` ≤ 1; the cap; `giveWay` at each step's threshold and between; `pageDUnit` equal to Home's scale; the screensaver canvas.
- Ally, through Steam's own setting (the call above, restored to Michael's 1.1951956748962402 after): Home at rest, raised feed, game page in the normal and Clean looks, the open transition (frame recording as for #64), the screensaver, at 1.0, 1.2, 1.35 and 1.5 (capped). Deck shape (16:10) through `scripts/cef-viewport.mjs`.

## Not in scope

A Game Glance size option; Steam's minimum font size (not live in Steam); high contrast and reduced motion (the same "follow Steam" pattern, later).
