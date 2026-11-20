# The Game Glance menu's dim — design

Date: 2026-11-12. Status: built; Deck-checked (Home, in-game, frame time); Ally checks open.
Mock-ups (scratchpad, painted on a real Ally frame of the menu on Home): `dim-home-A..D.png`; Michael's answer: the
menu and the context menus must match, so **B**.

## Goal

The Game Glance menu (the Steam button) looks like Steam's context menus in the Game Glance look
(`2026-11-12-context-menus-design.md`): the whole screen behind it is dimmed and softly blurred, and the menu's glass
shows that dimmed screen through it. Today the menu has no layer behind it (Steam's own 70% / 8 px scrim is cleared on
purpose, `src/menu/host.tsx`), so next to a context menu it reads brighter and flatter.

## Decisions (Michael, 2026-11-12)

| Question | Answer |
|---|---|
| Which menu | The Game Glance menu. Not Steam's Quick Access menu. |
| Look | **Match the context menus**: `rgba(5,7,10,.38)` over the whole screen + a 6 px blur (canvas px × Home's canvas scale). |
| Under the menu too | Yes: the dim is a layer **under** the menu's glass, so the glass shows a dimmed background; labels, icons and tiles' text keep their brightness. |
| Stays sharp | The status pill and the button hints, as over a context menu. |

## The look

| Part | Value |
|---|---|
| Dim colour | `rgba(5,7,10,.38)` (the context menus' `DIM`, from `TOKENS.scrim`). |
| Blur | 6 px on Home's canvas: `6 × homeCanvas(width, height).scale` CSS px, as the context menus' `u(6)` and the menu frost's `homeFrostBlur`. |
| Menu glass | Unchanged (`.40` glass, 16 px frost); it now frosts the dimmed screen. |
| Timing | In and out with the menu: the frost's own fade (`FadeMs` 150 over a game; the menu's presentation on Home). The dim never outlives the menu. |
| When | Whenever the Game Glance menu is open. No new setting: it is part of the menu's look, as its frost is. |

One value for both menus: the dim's colour, alpha and blur live in one constant shared by `menuCss` (context menus) and
the menu's frost, so they cannot drift apart.

## On Home and in Library (Steam's own UI behind the menu)

The menu's frost there is browser layers: `createHomeFrost` places one `backdrop-filter` surface per menu area in
Steam's window, just before the menu's viewport placeholder. The dim is **one more surface**, full screen, placed
**before** those area surfaces: `background: rgba(5,7,10,.38); backdrop-filter: blur(…)`. Each area surface then blurs a
screen that is already dimmed, which is how the context menus get their look. It is created, updated and cleared with
the area surfaces (same `apply` / `clear` / `dispose`, same guards: no surface when the frame is unusable).

**The status pill and the hints.** On Home they are the page's own (the status bar is held up under the menu,
`holdPageStatus`; the footer is the page's). A full-screen dim placed under the menu's viewport covers them. They must
stay sharp. The plan's first task probes the stacking on the Ally (read-only) and picks the smallest way that holds:
the page's status host and footer raised above the dim layer if they can be, else the dim surface split around them.
**Not allowed:** a CSS mask on a viewport-sized `backdrop-filter` (the frost code's own rule).

## Over a game (the shader)

Over a game the frost is the ReShade effect `qam-frost.fx.in`: it blurs only the menu's areas and blends them into the
game picture in `Composite`, with one `fade` per frame.

- **The dim** is applied in `Composite` after the areas are blended: `color = lerp(color, Scrim, 0.38 * fade * present)`
  over the whole picture (`present`: see Failure handling). The areas are dimmed with everything else, so the menu's glass shows a dimmed game; the menu itself
  (the popup, drawn above the effect) is not.
- **The blur** is a full-screen pass: down-sample the scene (as the areas' `…Down` passes do), separable blur
  (`…Horizontal` / `…Vertical`), sampled back in `Composite` under the dim, its strength matching 6 px at the output
  scale. It costs a full-screen pass every frame while the menu is open, so it ships **only if the frame time with the
  menu open over a game stays within 1 ms of the build without it** on the Ally (measured handheld, one demanding game).
  Otherwise the dim ships over games without the blur, and the spec records the measured cost.
- **The status pill and hints** over a game are the popup's own (the `status` area, the popup's footer), drawn above the
  effect: they stay sharp without anything extra.
- A shader change only takes effect after a **full restart** of the Ally (not a plugin reload or a Steam restart).

## Failure handling

The dim is part of the frost: when the frost is unavailable (`unsupported`, no backend, an unusable frame), there is no
dim either, and the menu looks as today. Home's dim surface obeys the same `supported()` guard. In the shader the dim's
weight is `0.38 × fade × present`, where `present` is the state's "an area is shown" flag (`Track` writes it): `fade`
alone is not enough, since with every area empty the state's start time is 0 and `fade` reads as fully in. Nothing
about the menu's behaviour changes.

## Testing

- **Shared constant:** the context menus' CSS and the menu's dim read the same colour, alpha and blur.
- **Home frost:** `apply` adds one full-screen dim surface before the area surfaces, with the colour and the scaled blur;
  `clear` / `dispose` remove it; an unsupported frame adds none; a closed keyboard area does not touch it.
- **Shader:** the generated effect contains the dim in `Composite`, weighted by the fade and the "present" flag, and (if
  kept) the full-screen blur passes; the existing shader tests still pass.
- **On the Ally:** the menu on Home, in Library and over a game, handheld and docked: the screen and the menu's glass are
  dimmed, labels are not, the status pill and hints stay sharp, the dim fades with the menu and never lingers (the
  menu→page hand-off included); a context menu and the menu side by side look the same; frame time over a game with the
  menu open, with and without the blur.

## Device results (2026-11-12, Steam Deck LCD on Anatase; the Ally was away)

- **Home:** the dim surface comes first (`dim`, `bar`, `panel`, `notifications`), `rgba(5,7,10,.38)` + 4.04 CSS px blur
  (6 × the Deck's canvas scale). The status pill and the hints stay sharp without any lift or split: the page's status
  host is `fixed` at z-index 5000 above Steam's UI layer (z-index 5), the footer is at z-index 7000 inside it, the menu's
  container at 3900.
- **Over a game, the Deck's frost never ran before this:** its Gamescope publishes no `GAMESCOPE_HDR_OUTPUT_FEEDBACK`, so
  `environment()` failed closed. **Fallback (added):** with no feedback, `GAMESCOPE_DISPLAY_SUPPORTS_HDR == 0` (the display
  cannot show HDR) counts as SDR; 1, missing or unreadable still fails closed; feedback, when present, still decides alone.
  With it, the frost and the dim run over a game on the Deck.
- **Frame time:** GPU busy sampled at 4 Hz over a paused game, menu toggled three times: at 1040 MHz 57.4% closed vs
  60.6% open, ≈ 0.5 ms a frame at 60 Hz for the glass, the dim and the blur together against no frost at all. Within the
  1 ms gate, so `DIM_BLUR` stays on. Coarse (busy % is sampled), to be confirmed on the Ally.
- **Timing (ruling):** on Home the dim appears and goes with the frost frames, not faded with the menu; the context
  menus' dim is not animated either. Revisit if it reads as a flash on the device.
- **Still to check:** Library, docked, side by side with a context menu, and the Ally (stacking and look).

## Out of scope

- Steam's Quick Access menu.
- Changing the menu's glass or the context menus' look.
- A setting to turn the dim off.
