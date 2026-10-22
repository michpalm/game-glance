# Game Glance visual language

Date: 2026-10-20. Status: design approved section by section in review; written spec awaiting review. No code has changed.

Visual reference: [Game Glance Visual Language](https://claude.ai/artifact/MEGivGmdtx737oxs3nv6xn) (private artifact; Q1–Q14 with the approved option marked "Proposed").

## Purpose and success criteria

Give every Game Glance surface one consistent visual language, so a control looks and behaves the same wherever it appears. Surfaces: Spotlight Home, the game page, the status bar, the screensaver, the plugin settings panel and the floating menu.

Spotlight Home is the reference. Home may receive small fixes (merging near-duplicate values, resolving its own inconsistencies) but stays recognisably the same.

The work succeeds when:

- One module, `src/styles/tokens.ts`, holds every shared colour, glass, edge, radius, type, spacing and motion value, and every surface reads from it.
- The 80 distinct `rgba()` colours, 29 radii and 13 blur values in today's style files collapse to the named sets below. Values that remain outside the module are listed in an allowlist with a reason.
- Focus, current, on and unavailable states look the same on every surface.
- Released surfaces (Home, game page, screensaver, status bar) show no visible change on the Ally apart from the small fixes listed under "Approved changes to released surfaces".

The floating menu's polish is a separate, later deliverable. It is built on these tokens after this work ships.

## Audit baseline (2026-10-20, branch `codex/floating-menu`)

| Measure | Count | Notes |
|---|---|---|
| Distinct `rgba()` values | 80 | Home 37, game page 32, menu 10, screensaver 7 |
| Distinct border radii | 29 | |
| Distinct blur values | 13 | 12–42 px |
| Font weights | 5 | 400–800, mostly 700 |
| Transition durations | 6 | 120–400 ms, mostly 250 ms |
| Focus treatments | 3 | Home buttons: white ring; Home cards: 1 px accent edge; menu: soft glass |
| Fallback accents | 2 | Home teal `#5fd1ae`; menu spec Steam blue `#1a9fff` |
| Accent variable names | 3 | `--glance-accent`, `--gg-accent`, `--gg-menu-accent` |

Home's original handoff values (comment in `src/home/homeCss.ts`): ink `#07090c`, scrim `rgb(5,7,10)`, glass `rgba(12,16,22,.38)` + blur 14 px, radii 8/12/16/999.

## 1. Colour, glass and accent

### Surfaces

| Token | Value | Use |
|---|---|---|
| `glass` | `rgba(12,16,22,.40)`, backdrop blur 16 px | Cards, chips, buttons, menu bar and panel, status pill |
| `glass-strong` | `rgba(12,16,22,.55)` | Anything layered on glass: focused rows, avatar rings |
| `glass-solid` | `rgba(12,16,22,.75)` | Small badges that must read on any artwork |
| `ink` | `#07090c` | Unchanged |
| `scrim` | `rgb(5,7,10)` | Page fades; unchanged |
| `art-fill` | `blur(42px) saturate(1.25) brightness(.8)` on a copy of the art, drawn larger than its box | Blurred artwork behind art that does not fill its space: the hero's whole-art mode, Home's hero fallback (`.gh-hero-blur`); later the capsule and feed-card fills |

One blur strength (16 px) everywhere a surface uses CSS backdrop blur. Blurred artwork is a different job: it must erase the art's detail so it reads as a backdrop, not as a smeared copy (16 px left shapes legible behind Home's cards on the Ally, 2026-10-23), so it has its own token, `art-fill`, Home's existing hero fill. The floating menu's Gamescope compositor blur over a running game is a separate mechanism measured in Steam's compositor units; it is unaffected.

### Edges

| Token | Value | Use |
|---|---|---|
| `edge` | `rgba(255,255,255,.12)` | Resting surfaces |
| `edge-raised` | `rgba(255,255,255,.18)` | Pressable controls (buttons) |
| `edge-active` | `rgba(255,255,255,.35)` | Selected or focused surfaces |

### Text and tracks

| Token | Value | Use |
|---|---|---|
| `text` | `#fff` | All primary text |
| `text-dim` | `rgba(255,255,255,.62)` | Labels, sublabels, inactive tabs; replaces the menu's `#d5dce3` |
| `text-shadow` | `0 1px 2px #0009` | All text on glass over artwork |
| `track` | `rgba(255,255,255,.14)` | Empty part of sliders and progress bars |
| `track-edge` | inset `0 0 0 1px rgba(255,255,255,.22)` | Slider tracks, so an empty track stays visible |

### Accent

One live accent per screen, from the existing artwork pipeline (`src/home/accent.ts`):

| Token | Value |
|---|---|
| `accent` | Raw artwork colour; fills (Play pill, slider fill, on toggles, chosen segments, glows) |
| `accent-text` | `legibleAccent(accent)`; accent used as text |
| `on-accent` | `#0b0d10`; text or thumb on an accent fill |

The fallback is Home's teal `#5fd1ae` on every surface, including the floating menu. This supersedes the floating-menu spec's Steam blue fallback. The same accent is used everywhere; it is not brightened per surface.

## 2. Interaction states

Four states, one meaning and one look each. Focus is always added on top of the other states; it never replaces "current" or "on".

| State | Meaning | Look |
|---|---|---|
| Focus | Where the controller is | 2 px white ring `rgba(255,255,255,.9)` plus accent glow below (`0 14px 40px -8px accent`). Compact controls (buttons, tiles, rows, segments) scale to 1.04; cards lift 4 px instead and show their 3 px accent bar. |
| Current | Where you are in navigation | Home's tab row: inactive `text-dim`, no box; current `text` with a 3 px accent underline at 55% opacity; focused tab: underline at full opacity with a `0 0 14px 2px accent` glow. Tabs do not use the focus ring. |
| On | A value that is set | Accent fill with `on-accent` text or thumb: toggle on track, slider fill, chosen segment |
| Unavailable | Steam reports the control unavailable | Home's ghost: `filter: grayscale(.6) brightness(.75)`, edge `rgba(255,255,255,.06)`. Visible, but cannot be operated. |

Mouse hover keeps Home's existing mouse-mode hover ring. Focus looks stay disabled in mouse mode, as today.

## 3. Shape, type, spacing and motion

### Radii

| Token | Value | Use |
|---|---|---|
| `r-small` | 8 | Capsules, small badges, slider tracks |
| `r-card` | 12 | Cards, tiles, setting rows |
| `r-panel` | 16 | Panels and sheets, including the floating menu bar and panel (26 today) |
| `r-pill` | 999 | Buttons, pills, tabs, toggles, segmented controls |

A shape nested inside another uses the outer radius minus the gap between them.

### Type

Two weights only: 700 and 800.

| Role | Spec | Replaces |
|---|---|---|
| `title` | Home's game title: 800, letter-spacing −.02em | — |
| `heading` | 20 / 800 | Menu panel headings where they remain |
| `body` | 16 / 700 | Button, row and card text; menu labels move from 13 to 16 |
| `label` | 11 / 800, letter-spacing .16em, uppercase, `text-dim` | Home's six label styles (9.5–12 px), menu section headers, slider notch labels |
| `value` | 20 / 700, tabular figures | Chip values, slider readouts |

Font family stays Steam's loaded Motiva Sans with the existing fallbacks.

### Spacing and units

Gaps and padding use one 4-point scale: 4, 8, 12, 16, 24, 32. Token sizes are written in Home's design unit (`--gg-d`, the 1440×810 handoff canvas). Each surface keeps its own conversion from that unit to screen pixels; the floating menu's approved on-screen size does not change, only the unit its sizes are written in.

### Motion

| Token | Duration | Use |
|---|---|---|
| `fast` | 150 ms | Press feedback, small colour changes |
| `base` | 250 ms | Focus and state changes |
| `accent` | 500 ms | Accent colour fades (existing `ACCENT_MS`) |

Existing tuned page and open transitions keep their own timings. `prefers-reduced-motion` disables all of them.

## 4. Components

Toggles, tiles, cards, tabs and sliders take the tokens above with no further decisions. Three rules settle the remaining choices:

- **Action buttons are pills.** At most one accent-filled (primary) button per view; all others are `glass` with `edge-raised`. Round buttons hold icons only.
- **Destinations have resting glass; settings do not.** Navigate tiles and Home cards are glass at rest. Setting rows sit directly on their panel; focus adds `glass-strong` and the focus ring.
- **Named options use a segmented control; numeric scales use a slider.** Up to five named options (Performance profile, Scaling mode, Scaling filter) use the same segmented control, with the chosen option as an accent fill. Volume, frame limit, overlay level and TDP remain sliders.

## 5. Code structure

### Token module

`src/styles/tokens.ts` exports:

- The token values in Sections 1–3 as typed constants.
- `tokenCss(selector)`: a CSS block declaring every token as a `--gg-*` custom property on `selector`, plus `@property --gg-accent` (syntax `<color>`) so accent changes can animate.
- Recipes returning CSS declarations: `glassSurface(level)`, `focusRing(kind)` for compact controls and cards, `currentUnderline()`, `onFill()`, `ghost()`.
- `applyAccent(root, colour | null)`: sets `--gg-accent` and `--gg-accent-text` on a surface root, falling back to teal for null.

`src/styles/homeGlass.ts` is folded into the module; its exports remain as re-exports until callers move.

### Surfaces

Each surface writes `tokenCss()` into its own document once:

| Surface | Where |
|---|---|
| Home | `SpotlightHome` style element |
| Game page | `src/styles/theme.ts` |
| Screensaver | `ScreensaverView` |
| Floating menu | `src/menu/host.tsx`, both the owner document and the popup document |

The accent variables `--glance-accent`, `--gg-accent` and `--gg-menu-accent` become `--gg-accent`. Old names stay as aliases pointing at the new one until every surface has moved, then are removed.

### Approved changes to released surfaces

These are the only intended visible changes to Home, the game page, the screensaver and the status bar:

1. Home info cards and Recents capsules: focus changes from a 1 px accent edge to the 2 px white ring; lift, glow and accent bar unchanged.
2. Small capital labels unify to 11 px / 800 / .16em.
3. Status pill weight changes from 600 to 700.
4. Glass, edge and blur values snap to the nearest token (for example `.38` → `.40` glass, blur 14 → 16).
5. Any 400/500/600 weights move to 700.

### Branch and release

Work happens on the local branch `design/visual-language`, created from `fix/3.4.1` (5 unreleased Home fixes ahead of `main`), in the worktree `../game-glance-visual-language`. Order: token module, then Home, game page, screensaver and status bar. This ships as release 3.5. The floating menu branch `codex/floating-menu` is then rebased onto it and polished using only tokens.

No fetch, push, pull request or release is part of this spec; those are separate steps.

## Testing

- Unit tests for `tokenCss()`: every token name is emitted, the accent `@property` is registered, and values match this spec.
- Unit tests for each recipe and for `applyAccent()` (fallback, legible text variant).
- Each surface's CSS builder includes the token block (assert on presence of `--gg-` declarations, not full snapshots).
- A guard test scans `src/**/*Css.ts`, `src/menu/styles.ts` and component inline styles and fails on raw `rgba()`, `blur()`, `border-radius` or `font-weight` literals outside `tokens.ts`, except entries in a reviewed allowlist (artwork effects such as gradient scrims and download fill; blurred artwork uses the `art-fill` token).
- Existing tests stay green; typecheck passes.
- Device: a full Gamescope compositor screenshot (mode 3) of Home, a game page and the screensaver on the Ally, docked and handheld, compared against the visual reference and against before-screenshots, to confirm only the approved changes are visible.

## Out of scope

- Floating menu layout and polish (next deliverable, built on these tokens).
- New colour themes or a user-selectable theme.
- Changes to Steam-owned native panels.
- Changing the Home layout, sizes or open transitions.
