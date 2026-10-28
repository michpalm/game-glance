# Game Glance visual language

Written 2026-10-20; re-reviewed on 3.6 on 2026-10-25. Status: ready for written review; in-game menu text and frost added 2026-10-28 (Q28–Q30); in-game menu grammar added 2026-10-28 (Section 6, Q31–Q36); Home, game page and screensaver grammar, frost and labels added 2026-10-28 (Section 7, Q37–Q42), awaiting written review. Every question is decided (see the decision log at the end). No code has changed. Ships as release 4.0.0.

Visual reference: [Game Glance Visual Language](https://claude.ai/artifact/MEGivGmdtx737oxs3nv6xn) (private artifact). This spec's questions on that page are Q1–Q14 and Q19–Q27; Q15–Q18 belong to the Deck Shelves spec; Q28–Q30 were decided on the device and are recorded only in the decision log; Q31–Q42 have their own reference pages, linked in Sections 6 and 7. Each approved option is marked "Proposed", or "Chosen" where Michael picked another.

## Identity: the focus is games

Added 2026-10-23. In Michael's words:

> I have a clear goal and vision for this plugin. Things should be simple, they should just work and you (and me) as a user should just be able to focus on what matters most, to play games and have a good time.
>
> The focus is games.
>
> That is why I have been adding some options to how the plugin behaves and some integrations with game related plugins (Unifideck, etc), but not that many on the cosmetic customization part. To enable the plugin to feel and work as it does, it reworks a lot of the standard way CSS Loader updates the OS look and feel. This makes it quite hard to ensure support across the available themes there... so my approach is to deliver an experience that just feel nice enough you don't want to change it too much, besides letting you pick some stuff of what it shows you on screen.

What this means for every surface and every setting:

- **Games first.** A surface earns its space by helping the player pick, start or follow a game. Decoration supports the art; it never competes with it.
- **The look is the product, not a setting.** This visual language is Game Glance's look. Colours, radii, type, blur and spacing are not offered as options, and CSS Loader themes are not promised to apply on restyled surfaces.
- **Options choose what you see, not how it looks.** An option is added when it lets players show or hide content they care about (a feed, a stat, a section), change how the plugin behaves, or connect a game-related plugin. Granular customisation for its own sake is not a goal.
- **One switch per thing the player cares about.** Choosing content can be as fine as the player's interests are: each kind of content (What's new, Friends, Recommended) can have its own switch. An option is named after the content, not the mechanism, and covers that content everywhere it appears, rather than one switch per surface or per element. The line is drawn at styling, never at content.
- **The default needs no change.** Every option's default is the intended experience; turning an option on or off never leaves a surface looking unfinished (no empty frames, no gaps where hidden content was).

Test for a proposed option: it passes all of (1) it changes what is shown or what happens, not a surface's styling; (2) it is one switch for one thing the player cares about; (3) the default is the experience we would ship without it. A borderline case is decided in the open and recorded here.

Recorded cases:

- **Hero art Fill/Fit** (3.6): about how much of the game's own art is seen, not the plugin's styling, so it is one global choice with Fill as the default. Accepted.
- **Home feed tabs** (#56, 3.6): a switch each for What's new, Friends and Recommended, all on; all off removes the feed. The game page's news is game-specific, so it is separate content with its own switch. Settings rows show only while the row they depend on is on (Profile picture under Status bar, wishlist deals under Recommended). Accepted.
- **Size** (#55, 3.6): no size option and no following Steam's display scale (tried, then dropped: every larger scale needed Home and the game page to give way identically for the open transition). Instead one better default for everyone: about 8.6% larger on 16:9, 7.3% on 16:10, as far as fits with only the air above the title giving way. Accepted: the default needs no change.

## Purpose and success criteria

Give every Game Glance surface one consistent visual language, so a control looks and behaves the same wherever it appears. Surfaces: Spotlight Home, the game page, the screensaver and the floating menu. The status bar is part of the surface it sits on (Home's `StatusBar`, the game page's `GameStatusBar`). The plugin settings panel keeps Steam's own look (Section 5).

Spotlight Home is the reference. Home may receive small fixes (merging near-duplicate values, resolving its own inconsistencies) but stays recognisably the same.

The work succeeds when:

- One module, `src/styles/tokens.ts`, holds every shared colour, glass, edge, radius, type, spacing and motion value, and every surface reads from it.
- The 55 distinct `rgba()` colours, 10 radii, 9 blur strengths and 7 timings in 3.6's style files (plus the floating menu's when it is rebased) collapse to the named sets below. Values that stay outside the module are on the allowlist (Section 5) with a reason.
- Focus, current, on and unavailable states look the same on every surface: the in-game menu follows Section 6, and Home, the game page and the screensaver follow Section 7.
- Released surfaces (Home, game page, screensaver, status bar) show no visible change on the Ally apart from the approved changes listed in Section 5.

The floating menu's polish is a separate, later deliverable, built on these tokens after this work ships.

## Audit baseline

Taken 2026-10-25 on `feature/3.6-hero-scale-whatsnew` at 751e7ed, which this work builds on. 3.6 has no floating menu; its numbers are added when `codex/floating-menu` is rebased (the 2026-10-20 audit on that branch counted 10 menu `rgba()` values, a soft-glass focus, a Steam blue fallback and `--gg-menu-accent`). Values are counted by number, whatever unit helper writes them (`unit(3)`, `dd(3)` and `3px` are one radius). 3.6's own work added no new values, only one radius variable, `--gho-ring-r`.

| Measure | Count | Notes |
|---|---|---|
| Distinct `rgba()` values | 55 | Home 37, game page 37, screensaver 7 by surface (shared values counted in each); unchanged since 3.4.2 |
| Distinct border radii | 10 | 0, 2, 3, 4, 8, 10, 12, 16, 50%, 999; plus avatar radii and `--gh-r-card`, `--gh-r-pill`, `--gho-ring-r` |
| Distinct blur values | 9 | 0, 10, 12, 14, 16, 22, 24, 28, 42 px; plus the screensaver's computed card blur |
| Font weights | 4 | 400, 600, 700 (20 uses), 800 (8 uses) |
| Transition durations | 7 | 120, 150, 200, 220, 250, 300, 400 ms, mostly 250 ms; 220 is the capsule state (`CAP_STATE_MS`) |
| Small-capital styles | 12 | 8.5 to 13 px, letter-spacing .12 to .2em, weights 700 and 800 |
| Focus treatments | 2 | Home buttons: white ring; Home info cards, feed cards and capsules: 1 px accent edge |
| Text on accent fills | 2 | White (Play pills); dark `#0b0d10` (Library button, feed pills) |
| Fallback accents | 1 | Home teal `#5fd1ae` (`DEFAULT_ACCENT`, `src/home/accent.ts`) |
| Accent variable names | 5 | `--glance-accent`, `--glance-accent-text`, `--gg-accent`, `--gh-card-accent`, `--gh-on-accent` |

Home's original handoff values (comment in `src/home/homeCss.ts`): ink `#07090c`, scrim `rgb(5,7,10)`, glass `rgba(12,16,22,.38)` + blur 14 px, radii 8/12/16/999.

## 1. Colour, glass and accent

### Surfaces

| Token | Value | Use |
|---|---|---|
| `glass` | `rgba(12,16,22,.40)`, backdrop blur 16 px | Cards, chips, buttons, menu bar and panel, status pill |
| `glass-strong` | `rgba(12,16,22,.55)` | Anything layered on glass: focused rows, avatar rings |
| `glass-solid` | `rgba(12,16,22,.75)` | Small badges that must read on any artwork, including the feed card pills (with `edge-raised` and white text) |
| `ink` | `#07090c` | Unchanged |
| `scrim` | `rgb(5,7,10)` | Page fades; unchanged |
| `art-fill` | `blur(42px) saturate(1.25) brightness(.8)` on a copy of the art, drawn larger than its box | Blurred artwork that stands alone: the hero's whole-art mode, Home's hero fallback (`.gh-hero-blur`), the Recents capsule fill (`.gh-cap-blur`) |
| `art-fill-dim` | `blur(42px) saturate(.7) brightness(.5)`, drawn the same way | Blurred artwork that carries text: the feed's friend backdrops (`.gh-card-backdrop`) and news fills (`.gh-card-fit-blur`) |
| `empty-fill` | `linear-gradient(160deg, rgba(255,255,255,.10) 0%, rgba(12,16,22,.35) 75%)` | A feed card with no art or avatar (`.gh-card-backdrop-none`) |

One blur strength (16 px) everywhere a surface uses CSS backdrop blur. Blurred artwork is a different job: it must erase the art's detail so it reads as a backdrop, not as a smeared copy (16 px left shapes legible behind Home's cards on the Ally, 2026-10-23), so it has its own two tokens, one blur strength (42 px), split by what sits on the art. The floating menu's Gamescope compositor blur over a running game is a separate mechanism measured in Steam's compositor units; it is unaffected.

`glass-strong` only shows over artwork or glass; on an opaque panel it matches the background, so focus there is the ring alone.

### Edges

| Token | Value | Use |
|---|---|---|
| `edge` | `rgba(255,255,255,.12)` | Resting surfaces |
| `edge-raised` | `rgba(255,255,255,.18)` | Pressable controls (buttons), feed card pills |
| `edge-active` | `rgba(255,255,255,.35)` | Selected or focused surfaces |

### Text and tracks

| Token | Value | Use |
|---|---|---|
| `text` | `#fff` | All primary text |
| `text-dim` | `rgba(255,255,255,.62)` | Labels and sublabels outside the in-game menu (Home, game page, screensaver); replaces the menu's `#d5dce3` |
| `text-idle` | `rgba(255,255,255,.80)` | Unselected choices in a row of options: the menu's main tabs, Performance categories (code: `idle`, `--gg-text-idle`) |
| `text-label` | `rgba(255,255,255,.90)` | Small secondary text inside the in-game menu, always with `text-shadow` (code: `label`; the menu sets `--gg-text-dim` to it, so menu rules keep reading `--gg-text-dim`) |
| `text-shadow` | `0 1px 2px #0009` | All text on glass over artwork |
| `track` | `rgba(255,255,255,.14)` | Empty part of sliders and progress bars |
| `track-edge` | inset `0 0 0 1px rgba(255,255,255,.22)` | Slider tracks, so an empty track stays visible |

Inside the in-game menu the game shows through the frost, so its small text needs more than Home's 62%. Unselected tabs and categories use `text-idle`; the selected one stays `text`, marked as Section 6's `selected` slice (Q36; it was an underline when Q28 was decided), and tabs take no text shadow. Every 11 px secondary line (the power line, section labels, Friends, Nobody online, Last online, tile captions, notification times, setting descriptions, the L1/R1 hints) uses `text-label` with `text-shadow`. Home, the game page and the screensaver do the same (Section 7, Q42); `text-dim` stays only for the settings panel's HowLongToBeat line. Measured on a real Ori frame on the Ally (2026-10-28): 62% labels read 2.3–4.8:1 and unselected 62% tabs 3.1–4.8:1; with `text-label`, the shadow and the frost's calm curve (below) every measured label stays above 5:1, also over a bright scene.

### In-game frost

The menu bar, the panel and the notification bell are the three frost regions: each is `glass` (.40) with `edge` over the game, which the frost shader blurs. The bell takes the same .40 glass as the bar and panel, not `glass-strong`.

Every other glass surface takes the same frost in CSS (Section 7, Q41). Under the glass the shader calms bright areas: a frosted pixel's luma above 0.45 rises at 35% of the rate (RGB scaled together, so hue is kept); darker scenes are unchanged. Reason: through .40 glass a bright sky left small labels near 2.4:1. Code: `Calm()` in `py_modules/gameglance/frost/assets/qam-frost.fx.in`, `CalmKnee 0.45`, `CalmSlope 0.35`.

### Accent

One live accent per screen, from the existing artwork pipeline (`src/home/accent.ts`). Nothing takes a per-card or per-game accent of its own: feed pills are neutral glass and empty feed cards use `empty-fill`.

| Token | Value |
|---|---|
| `accent` | Raw artwork colour; fills (Play pill, slider fill, on toggles, chosen segments, glows) |
| `accent-text` | `legibleAccent(accent)`; accent used as text |
| `on-accent` | `#fff`; text, icon or thumb on an accent fill |

`on-accent` is white everywhere, as on Play today, for one consistent look. Accepted trade-off: bright accents read lower (3.1:1 on Dorfromantik's `#c88437`, 1.9:1 on the teal fallback, against 8.2:1 on Ori's `#3d33cd`).

The fallback is Home's teal `#5fd1ae` on every surface, including the floating menu; this supersedes the floating-menu spec's Steam blue fallback. The same accent is used everywhere; it is not brightened per surface.

## 2. Interaction states

Four states, one meaning and one look each. Focus is always added on top of the other states; it never replaces "current" or "on".

| State | Meaning | Look |
|---|---|---|
| Focus | Where the controller is | 2 px white ring `rgba(255,255,255,.9)` plus accent glow below (`0 14px 40px -8px accent`). Compact controls (buttons, tiles, rows, segments) scale to 1.04; cards (info cards, feed cards, capsules) lift 4 px instead and show their 3 px accent bar. |
| Current | Where you are in navigation | Home's tab row: inactive `text-dim` (`text-idle` in the in-game menu's tabs and Performance categories), no box; current `text` with a 3 px accent underline at 55% opacity; focused tab: underline at full opacity with a `0 0 14px 2px accent` glow. Tabs do not use the focus ring. |
| On | A value that is set | Accent fill with `on-accent` text or thumb: toggle on track, slider fill, chosen segment |
| Unavailable | Steam reports the control unavailable | Home's ghost: `filter: grayscale(.6) brightness(.75)`, edge `rgba(255,255,255,.06)`. Visible, but cannot be operated. |

Inside the in-game menu, Section 6's states apply instead (Q35, Q36); on Home, the game page and the screensaver, Section 7's (Q39, Q40).

Mouse hover keeps Home's existing mouse-mode hover ring. Focus looks stay disabled in mouse mode, as today.

## 3. Shape, type, spacing and motion

### Radii

| Token | Value | Use |
|---|---|---|
| `r-small` | 8 | Capsules, small badges |
| `r-card` | 12 | Cards (including the game page's info cards), tiles, setting rows |
| `r-panel` | 16 | Panels and sheets, including the floating menu bar and panel (26 today) |
| `r-pill` | 999 | Buttons, pills, tabs, toggles, segmented controls, slider tracks, thin bars, circles |

Inside the in-game menu, buttons, tabs and segmented controls are cards and slices instead of pills (Section 6, Q34). On Home and the game page, action buttons take `r-action` and `r-action-icon` and the feed tabs are slices of a strip (Section 7, Q38, Q40).

Every radius uses its role's token. A shape nested inside another uses the outer radius minus the gap between them. Thin bars (progress, achievements, chips, screensaver) and circles are already fully round, so `r-pill` leaves them unchanged.

### Type

Two weights only: 700 and 800. Font family stays Steam's loaded Motiva Sans with the existing fallbacks.

| Role | Spec | Use |
|---|---|---|
| `title` | Home's game title: 800, letter-spacing −.02em | Game titles |
| `heading` | 20 / 800 | Menu panel headings where they remain |
| `body` | 16 / 700 | Button, row and card text; menu labels move from 13 to 16 |
| `label` | 11 / 800, letter-spacing .16em, uppercase, `text-dim` | Every small capital except the tabs: Home's "Last played" (12 today), chip labels (10), feed pills (10), card lines (10.5), ghost and Library labels, the screensaver's labels (9), the game page's card labels (8.5); menu section headers, slider notch labels |
| `tab` | 13 / 700, letter-spacing .16em, uppercase | The feed tabs. They are navigation (the "current" state), not labels, so they keep today's size. |
| `value` | 20 / 700, tabular figures | Chip values, slider readouts |

At 800 with .16em spacing, small capitals run wider than today: the "Recently updated" lines on Home cut off sooner, and implementation checks every `label` use for truncation.

### Spacing and units

Gaps and padding use one 4-point scale: 4, 8, 12, 16, 24, 32.

Token sizes are written in Home's design unit (`--gg-d`: the 1440×810 handoff canvas, 1280×800 on 16:10 screens). 3.6's larger default (#55) is built into that unit, so tokens grow with it and need no size of their own. Each surface keeps its own conversion from that unit to screen pixels; the floating menu's approved on-screen size does not change, only the unit its sizes are written in.

Snapping spacing to the 4-point scale must not change the height of Home's lower stack: `giveWay.ts` measures it, and a test keeps those numbers equal to `homeCss`.

### Motion

| Token | Duration | Use |
|---|---|---|
| `fast` | 150 ms | Press feedback, small colour changes (today 120 and 200 ms) |
| `base` | 250 ms | Focus and state changes (today 220 ms on capsules, 300 ms on feed cards) |
| `accent` | 500 ms | Accent colour fades (existing `ACCENT_MS`) |

Tuned motion keeps its own timing and is on the allowlist: the page (300 ms), the tab strip (300 ms), the feed sheet (400 ms) and the open transitions. `prefers-reduced-motion` disables all of it.

## 4. Components

Toggles, tiles, cards, tabs and sliders take the tokens above with no further decisions. Three rules settle the remaining choices:

- **Action buttons are pills.** At most one accent-filled (primary) button per view; all others are `glass` with `edge-raised`. Round buttons hold icons only.
- **Destinations have resting glass; settings do not.** Navigate tiles and Home cards are glass at rest. Setting rows sit directly on their panel; focus adds `glass-strong` and the focus ring.
- **Named options use a segmented control; numeric scales use a slider.** Up to five named options (Performance profile, Scaling mode, Scaling filter) use the same segmented control, with the chosen option as an accent fill. Volume, frame limit, overlay level and TDP remain sliders.

The in-game menu refines these in Section 6: its buttons are cards, and its chosen options are `selected` slices. Section 7 refines them for Home and the game page: action buttons are soft cards.

## 5. Code structure

### Token module

`src/styles/tokens.ts` exports:

- The token values in Sections 1–3 as typed constants.
- `tokenCss(selector)`: a CSS block declaring every token as a `--gg-*` custom property on `selector`, plus `@property --gg-accent` (syntax `<color>`) so accent changes can animate.
- Recipes returning CSS declarations: `glassSurface(level)`, `artFill(dim)`, `focusRing(kind)` for compact controls and cards, `currentUnderline()`, `onFill()`, `ghost()`.
- `applyAccent(root, colour | null)`: sets `--gg-accent` and `--gg-accent-text` on a surface root, falling back to teal for null.

`src/styles/homeGlass.ts` (on `codex/floating-menu`; not on 3.6) is folded into the module when the menu is rebased; its exports remain as re-exports until callers move.

### Surfaces

Each surface writes `tokenCss()` into its own document once:

| Surface | Where |
|---|---|
| Home | `SpotlightHome` style element |
| Game page | `src/styles/theme.ts` |
| Screensaver | `ScreensaverView` |
| Floating menu | `src/menu/host.tsx`, both the owner document and the popup document |

The plugin settings panel (`SettingsPanel.tsx`) is built only from Decky's components and keeps Steam's Quick Access look, matching the tabs around it: tokens there would bring a per-game accent among Steam's blue toggles, and `glass-strong` does not show on Steam's solid panel. Its one style of its own, the dimmed HowLongToBeat match line, moves to `text-dim` and the `label` size.

### Accent names

| Today | Becomes |
|---|---|
| `--glance-accent`, `--gg-accent`, `--gg-menu-accent` (after the menu rebase) | `--gg-accent` |
| `--glance-accent-text` | `--gg-accent-text` |
| `--gh-on-accent` | the `on-accent` token |
| `--gh-card-accent` | removed: feed pills are neutral glass and empty cards use `empty-fill` |

Old names stay as aliases pointing at the new one until every surface has moved, then are removed.

### Approved changes to released surfaces

These are the only intended visible changes to Home, the game page, the screensaver and the status bar:

1. Home info cards, feed cards and Recents capsules: focus changes from a 1 px accent edge to the 2 px white ring and keeps its lift; the accent glow and accent bar are removed (Section 7, Q39).
2. Small capitals unify to the `label` role (11 / 800 / .16em): "Last played" 12 → 11, chip labels and pills 10 → 11, card lines 10.5 → 11, the screensaver's labels 9 → 11. The feed tabs keep 13 / 700 as the `tab` role.
3. Status pill weight changes from 600 to 700.
4. Glass, edge and blur values snap to the nearest token (for example `.38` → `.40` glass, blur 12 and 14 → 16).
5. Any 400/500/600 weights move to 700.
6. The game page's info cards: radius 10 → 12, backdrop blur 10 → 16, labels 8.5 / 700 / .12em → the `label` role. Their labels keep today's height on screen; the spacing widens and the weight rises.
7. Home's Library button: text changes from `#0b0d10` to white.
8. Timings: a capsule's focus settles in 250 ms instead of 220, a feed card's in 250 instead of 300, the game page's card press in 150 instead of 120, and 200 ms colour changes in 150.
9. Feed card pills ("News", "Major Update", and the friend cards' "In-game", whose teal is the default accent, not a status colour) change from each card's game accent with dark text to `glass-solid` with a raised edge and white text.
10. Feed artwork fills move to `art-fill-dim` (friend backdrops blur 28 → 42, news fills 24 → 42) and the capsule fill to `art-fill` (blur 22 → 42); the feed looks as calm as today.
11. A feed card with no art or avatar shows `empty-fill` instead of a gradient in its game's accent.
12. Play and the action buttons take `r-action` (26); the round icon buttons become `r-action-icon` (22) tiles; buttons focus with the white ring only, no glow or 1.04 scale (Section 7, Q38, Q39).
13. The feed tabs sit on a glass strip; the current tab is a `selected` slice instead of an accent underline (Q40).
14. Every glass surface takes the in-game frost: one 16 px blur, .40 glass and the calm curve where Steam supports it; the game page's icon buttons blur the art (Q41).
15. Small secondary text moves from 62% to 90% white with a soft shadow; "Last played" gains the shadow (Q42).

### Allowlist

Values that stay outside `tokens.ts`, each with its reason:

- Artwork effects: gradient scrims and shades, the download fill.
- The Library card's grid icon: its 2-unit cells are a drawing, not a shape role.
- Friend status colours (`FRIEND_COLOURS`) on avatar rings and the status bar: they carry meaning (online, away), not style.
- Tuned timings: the page (300 ms), the tab strip (300 ms), the feed sheet (400 ms) and the open transitions.

### Branch and release

Work happens on the local branch `design/visual-language`, in the worktree `../game-glance-visual-language`, based on `feature/3.6-hero-scale-whatsnew` (751e7ed, which contains v3.4.2 and v3.5.0). Order: token module, then Home, game page, screensaver and status bar. This ships as release 4.0.0, after 3.6.0. 3.6.0 contains nothing from this spec; if 3.6 gains commits before it ships, this branch is rebased onto its final state. The floating menu branch `codex/floating-menu` is then rebased onto it and polished using only tokens.

No fetch, push, pull request or release is part of this spec; those are separate steps.

## 6. In-game menu grammar

Added 2026-10-28 (Q31–Q36). The in-game menu had several looks for the same job: two label styles for one setting, choices with and without a track, a second underline row for Performance's categories, a ring on tiles but an underline glow on tabs, and pills beside square cards. This section gives the menu one grammar, kept very readable, simple and clean. Inside the menu it overrides Sections 2–4 where they differ; Section 7 carries it to Home, the game page and the screensaver.

Visual reference, rendered from the menu's own markup and styles saved on the Ally over a real Ori frame (private artifacts): [Structure](https://claude.ai/artifact/CY3dp7rAYfZKQZfGh1azJF), [Controls](https://claude.ai/artifact/1ZhUYr9y8U4gxbtZZN8YCZ), [Shape and focus](https://claude.ai/artifact/KJ4qmzyVKNabjmZrZtTAaD), [Selected slice](https://claude.ai/artifact/GghVenM2kcw38Y8Ktz5dds) (option 3 chosen).

### Shape

Two shapes only:

- **Cards**, `r-card` (12): tiles, setting rows, notification rows, friend rows, buttons, the bell, the message field, and every track that holds options. The bar and panel keep `r-panel` (16).
- **Slices**: an option inside a bar or track. A slice runs edge to edge and from the track's top to its bottom, square inside (the track clips its outer corners), with a 1 px `edge` hairline between slices. The main tabs are slices of the menu bar; Performance's categories, Scaling mode, Scaling filter and the performance profile are slices of their tracks.

`r-pill` stays only where the round shape is the control: toggle switches, slider tracks and thumbs, progress bars, and circles (avatars, the unread dot). The status pill shown above the menu belongs to the status bar and keeps its shape.

### States

| State | Look in the menu |
|---|---|
| Focus | A 2 px white ring (`#fff`) that follows the shape: 2 px outside a card, 2 px inside a slice (`outline-offset: -2px`, so the track never clips it). The fill steps up to `glass-strong`; a focused selected item keeps its `selected` fill and line. No growth and no glow. |
| Selected | `selected`: a soft white shade with a faint accent line along the bottom edge. One mark for the page you're on (tab), the category, the chosen option, the open friend and the bell while Notifications is open. |
| On | A toggle that is on and a slider's fill stay `accent`: these are values, not selections. |
| Unavailable | Section 2's ghost. A choice is never greyed out while Steam applies it (see Choices). |

Focus and selection differ by form, not only colour: a crisp outline against a soft fill. A focused selected slice shows both. The accent is a small marker in the menu (the selection line, on toggles, slider fills, progress bars, the unread dot), never a large fill.

New tokens:

| Token | Value | Use |
|---|---|---|
| `selected` | `rgba(255,255,255,.14)` | Fill of a selected slice, friend row or bell |
| `selected-edge` | inset `0 -2px 0` `color-mix(in srgb, accent 55%, transparent)` | The line along a selected item's bottom edge; an inset shadow, so it adds no height |

Selected text is `text`; unselected slices stay `text-idle` (Q28).

### Structure

- **Page title.** Every page opens with a `heading` title, with the page's status on the right in `text-label` (Social: who is online; Configure menu: how many are on the bar). Performance keeps its power line under the title, since its right side holds the Per-game profile switch. A page's own action (Notifications' Steam, Navigate's Steam menu) sits on the right of the title row instead, as a card button with an icon.
- **Two label styles.** A *section label* (`label` role: 11 / 800 / uppercase, `text-label`) names a group, such as Connectivity or Friends. A *setting label* (`body`: 16 / 700, `text`, no uppercase) names one setting: Frame limit, Scaling mode, Performance profile. Nothing else labels a control.
- **Choice groups are always on a track.** Named options (up to five) are slices of a card track, whatever page they are on.
- **Sub-navigation is a choice group.** Performance's categories (Display, Scaling, Power & GPU, Overlay) are a choice group under the page title, never a second underline row.
- **The bell marks Notifications.** While Notifications is open the bell is `selected` and no tab is.

### Controls

- **One setting row.** Every setting is a row: icon, setting label, then its value or switch on the right. Frame limit, Overlay level and Show overlay in Steam gain icons (gauge, layers, eye), matching Quick settings.
- **Sliders show the value beside the label** (120 FPS, Off, 65%). No tick labels under the track.
- **Choices respond at once.** Pressing an option selects it immediately; while Steam applies it a small spinner turns inside that option (a still ring under reduced motion). Options never grey out while a change applies, which is what made Scaling feel slow. If Steam refuses the change, the selection returns to Steam's value and the setting shows its usual error line.
- **Layout.** Toggles sit two per row. A slider takes the full row unless it has a partner (Volume with Microphone).

### Tiles and buttons

- **One tile.** Icon (24), title (`body`) and an optional caption (`text-label`), centred, 112 units high on every page; the In game grid no longer stretches to fill the panel. A caption appears only when it adds something (In game's "10 of 37"), so Navigate's tiles have none.
- **Buttons are cards with an icon.** A button that leaves the menu for Steam shows the arrow icon. Navigate's "Open Steam menu" becomes "Steam menu" in the title row.

### Code

- `tokens.ts`: `selected` and `selected-edge` tokens; `focusRing()` gains a `slice` kind (inset ring, no transform) and the menu uses a `menu` kind without growth or glow; `currentUnderline()` is no longer used by the menu; a `selectedSlice()` recipe returns the fill and edge.
- `src/menu/styles.ts` and `socialStyles.ts`: tabs, `.gg-menu-perf-tabs` and `.gg-menu-segmented` become slice tracks; buttons and the bell move from `r-pill` to `r-card` (the message field already uses it); the grid's fixed tile height; setting headers take the setting label.
- The pending choice needs a short-lived local selection per control, cleared when Steam reports its value or fails.

### Testing

- Style tests: no `r-pill` in the menu outside switches, slider tracks, progress bars and circles; every selected rule uses `selected` and `selected-edge`, and none uses an `accent` background; focus rules in the menu have no `transform` and no `--gg-focus-shadow`.
- A behaviour test for the pending choice: selected at once, spinner shown, cleared on Steam's value, reverted with the error line on failure.
- Device: each menu page on the Ally over a bright and a dark scene, checking the selected slice is visible on both and focus never looks like selection.

## 7. Home, game page and screensaver grammar

Added 2026-10-28 (Q37–Q42). Section 6 gave the in-game menu one grammar. This section carries it to Home, the game page and the screensaver, so that the same control looks and behaves the same in and out of the menu. Where this section differs from Sections 1–5, this section wins on these surfaces. Home stays recognisably Home: Play keeps a rounded shape and large cards keep their lift.

Visual reference, painted on real Ally frames (private artifacts): [Home and Game Page Grammar](https://claude.ai/artifact/4b316CCxyN8q77EZbLDR5H) (defaults: Play soft, tabs on a strip, card focus ring and lift) and [Frost and Labels](https://claude.ai/artifact/1NguTkv9BEitQAVBPREoDu).

### Shape

- **Action buttons are soft cards.** Play, and the other wide action buttons on Home's action row and the game page (Library, the Play and stream pair), take `r-action` (26). The icon buttons beside Play (controller, settings, cloud) become square tiles, the same height as Play, with `r-action-icon` (22). Chosen over keeping the pill and over the menu's `r-card` 12: close to today's shape, one step toward the menu.
- **Play keeps its accent fill** and stays the one accent button on a view. Icon tiles are `glass` with `edge-raised`; the cloud's sync dot stays in the tile's corner.
- **Pills stay for status and selectors**: the status pill, the Steam source pill, the family copy and store pills, the "Online" count, thin bars. Capsules, feed cards and info cards keep their radii.

| Token | Value | Use |
|---|---|---|
| `r-action` | 26 | Play and wide action buttons on Home and the game page |
| `r-action-icon` | 22 | Square icon buttons beside Play |

Both are in the design unit, like every other size token. At Play's height (62 on the Ally) 26 still reads as rounded ends, while 12 reads as a card.

### States

| State | Look on Home, the game page and the screensaver |
|---|---|
| Focus, buttons and tiles | Section 6's ring: 2 px white, 2 px outside, following the shape. Glass tiles step up to `glass-strong`; Play keeps its accent fill. No growth and no glow. |
| Focus, feed cards and Recents capsules | The same ring, plus today's 4 px lift with a neutral shadow, `0 14px 28px -12px rgba(0,0,0,.75)`. No accent glow and no accent bar. |
| Current, feed tabs | The tabs sit on a `glass` strip (`r-card`, `edge`) and are slices of it, as the menu's tabs are of the menu bar. The current tab is `selected` with `selected-edge`; the others are `text-idle`. A focused tab shows Section 6's inset ring (offset −2 px) on top. The underline and its glow are removed. |
| On, Unavailable | Unchanged (Section 2). |

The accent means chosen or on, never focus, on every surface. Mouse hover keeps Home's hover ring, and focus looks stay off in mouse mode.

### Frost

Every glass surface outside the menu uses the in-game frost: the status bar, the Steam and copy pills, the game page's info cards, the icon tiles, Home's tab strip and buttons, and the screensaver's cards. That is `glass` (.40) over a 16 px blur (σ = 16 CSS px, the same Gaussian as the shader's), with the calm curve (Section 1, In-game frost: luma above 0.45 rises at 35%, hue kept).

- **One blur.** Today these surfaces use 10, 12, 14 and 16 px at .38 or .40. They all move to `glass-blur` and `glass`.
- **The game page's icon buttons blur the art.** Today they show the art sharp through their tint, because a `backdrop-filter` inside a flat container sees only that container. Every container from the scene down to them keeps `transform-style: preserve-3d`, as the cards already do.
- **The calm curve in CSS.** A recipe, `frostSurface()`, adds the curve as an SVG filter in the same `backdrop-filter`: a per-channel transfer table (21 steps, `color-interpolation-filters: sRGB` so it works on the same encoded values as the shader) that is the identity below 0.45 and rises at 0.35 above it. It is per channel, not per luma like the shader, so a bright saturated colour can shift slightly; on Steam's screens the art under glass is mostly mid to dark, where nothing changes. If Steam's browser does not support SVG filters in `backdrop-filter` (checked on the Ally first), the recipe returns blur and glass only. That fallback is already today's spec, so nothing else waits on the check.
- **Blurred artwork is separate.** `art-fill` and `art-fill-dim` (Section 1) are unchanged: they erase art behind content, not frost a surface.

### Labels

Small secondary text on Home, the game page and the screensaver takes the menu's style: `text-label` (90%) with `text-shadow`. This covers card labels, chip labels, the feed's meta lines, row headers and the Recently updated lines. "Last played" keeps `accent-text` and gains the same shadow. Section 1's `text-dim` stays only for the plugin settings panel's HowLongToBeat line.

Measured on real Ally frames, worst 5% of each label's background, WCAG formula (2026-10-28):

| Text | 62% today | 90% + shadow |
|---|---|---|
| Recently updated line on bright art (Assassin's Creed) | 3.8:1 | 5.9:1 |
| Recently updated line (Metro 2033 Redux) | 4.4:1 | 7.3:1 |
| Feed meta lines, row header | about 7:1 | about 14:1 |
| Game page info card labels (Ori) | 7.3:1 | 15.4:1 |
| Screensaver info card labels (TOEM) | 6.2:1 | 12.1:1 |

Text on glass already read well; text directly on bright art did not. The weight, size and spacing of the `label` role are unchanged.

### Code

- `tokens.ts`: `r-action` and `r-action-icon`; `frostSurface(level)` (glass, blur and the calm filter, with the fallback); `focusRing()` gains a `lift` kind (ring, 4 px lift, neutral shadow). Home, the game page and the screensaver use `focusRing('menu')` for buttons and tiles, `focusRing('lift')` for cards and capsules, `focusRing('slice')` and `selectedSlice()` for the feed tabs.
- `src/home/homeCss.ts`: the action row's radii and icon tiles; focus rules lose the accent glow, the 1.04 scale and `.gh-card-bar`; `.gh-tab-line` is replaced by the strip and slices; every glass rule reads `frostSurface()`; labels move to `text-label` with the shadow.
- `src/styles/themeCss.ts`: the game page's Play and icon buttons, their focus, `preserve-3d` down to the icon buttons, and the info cards' frost.
- `src/styles/sourcePill.ts`, `src/styles/homeGlass.ts`, `src/screensaver/screensaverCss.ts`: blur and glass from the recipe.
- `homeCardFocusShadow` is removed once nothing uses it.

### Testing

- Style tests: no accent in any focus rule on Home, the game page or the screensaver; no `transform: scale` in their focus rules; card and capsule focus use `focusRing('lift')`; every `backdrop-filter` outside the menu comes from `frostSurface()` or `art-fill`; the feed tabs use `selectedSlice()` and no `.gh-tab-line`; the action row uses `r-action` and `r-action-icon`.
- The `giveWay.ts` / `homeCss` stack test stays green: the tab strip keeps the tab row's height.
- Device, first: does Steam's browser on the Ally apply an SVG filter in `backdrop-filter`? This decides whether the calm filter ships or the fallback does.
- Device: Home (rest and feed open), Ori's and a bright game's page, and the screensaver, over a bright and a dark scene. Check that the white ring stays visible over bright art, the Recently updated lines read on bright art, and the frost matches the menu's over the same scene.

## Testing

- Unit tests for `tokenCss()`: every token name is emitted, the accent `@property` is registered, and values match this spec.
- Unit tests for each recipe and for `applyAccent()` (fallback, legible text variant).
- Each surface's CSS builder includes the token block (assert on presence of `--gg-` declarations, not full snapshots).
- A guard test scans `src/**/*Css.ts`, `src/menu/styles.ts` and component inline styles and fails on raw `rgba()`, `blur()`, `border-radius`, `font-weight` or `ms` duration literals outside `tokens.ts`, except allowlist entries.
- Existing tests stay green, including the `giveWay.ts` / `homeCss` stack test; typecheck passes.
- Truncation: every `label` use is checked at the new width (the "Recently updated" lines first).
- Device: a full Gamescope compositor screenshot (mode 3) of Home (rest and feed open), a game page and the screensaver on the Ally, docked and handheld, compared against the visual reference and against before-screenshots, to confirm only the approved changes are visible.

## Out of scope

- Building the floating menu's polish (next deliverable, built on these tokens). Its grammar is decided in Section 6; the work to apply it is planned separately.
- New colour themes or a user-selectable theme.
- Changes to Steam-owned native panels, including the Quick Access panel that holds Game Glance's settings (beyond its one line in Section 5).
- Changing Home's layout, its size (settled in 3.6, #55) or its open transitions.

## Decision log

All on the visual reference page except Q28–Q42 (Q31–Q42 on the pages linked in Sections 6 and 7). Q1–Q14 decided 2026-10-20 on `codex/floating-menu`; Q19–Q27 decided 2026-10-25 in the re-review on 3.6; Q28–Q30 decided 2026-10-28 for the 4.0 in-game menu from contrast measured over real Ally frames and confirmed on the device (`codex/social-chat`, ab5eb37, 81a718e, d0c51ca).

| Q | Decision |
|---|---|
| Q1 | Focus is the 2 px white ring plus accent glow, on every surface |
| Q2 | Home cards move from the accent edge to the white ring |
| Q3 | "Current" reuses Home's tab row (dim, underline, glow when focused) |
| Q4 | A chosen value is an accent fill |
| Q5 | Unavailable controls use Home's ghost look |
| Q6 | Menu corners use the panel radius 16, not 26 |
| Q7 | Menu text moves from 13 to Home's 16 body size |
| Q8 | One small-capital style (refined by Q25: the tabs keep their own) |
| Q9 | Status pill weight 700 |
| Q10 | Three durations: 150, 250, 500 ms (refined by Q22) |
| Q11 | Action buttons are pills |
| Q12 | Setting rows are bare at rest |
| Q13 | Named options use a segmented control; numeric scales a slider |
| Q14 | The language ships first as its own release, then the menu (now 4.0.0 on 3.6) |
| Q19 | The settings panel keeps Steam's Quick Access look |
| Q20 | Text on accent fills is white (chosen over "per accent" for consistency) |
| Q21 | The game page's info cards take `r-card`, glass blur and the `label` role |
| Q22 | Timings move to the tokens by job; the page, tab strip, feed sheet and open transitions keep theirs |
| Q23 | Blurred artwork: one strength, `art-fill` for art alone, `art-fill-dim` under text |
| Q24 | Feed card pills are neutral glass (chosen over the screen's accent) |
| Q25 | Small capitals at 11; the feed tabs keep 13 as the `tab` role |
| Q26 | A feed card without art gets a neutral tint (`empty-fill`) |
| Q27 | Feed cards take the white focus ring (a check of Section 2) |
| Q28 | In the in-game menu, unselected tabs and categories are `text-idle` (80%), no text shadow; the selected one stays `text` with its underline (2026-10-28) |
| Q29 | In the in-game menu, small secondary text is `text-label` (90%) with `text-shadow`; Home keeps `text-dim` (2026-10-28) |
| Q30 | The in-game frost calms luma above 0.45 to 35% of its rise, hue kept; the bell uses the bar's .40 glass (2026-10-28) |
| Q31 | The in-game menu gets one grammar (Section 6), built in the menu first; chosen over restyling component by component (2026-10-28) |
| Q32 | Menu structure: page titles, two label styles, choices always on a track, categories as a choice group, the bell marks Notifications (2026-10-28) |
| Q33 | Menu controls: one setting row, slider value beside the label, choices respond at once with a spinner, toggles two per row (2026-10-28) |
| Q34 | Menu shape: cards and full-height slices; pills only for switches, slider tracks, progress bars and circles (2026-10-28) |
| Q35 | Menu focus: a white ring following the shape, no growth or glow; supersedes Q1 and Q3 inside the menu (2026-10-28) |
| Q36 | Menu selection: a soft white shade with a faint accent line (option 3, chosen over accent fill, plain shade and accent tint); supersedes Q4, Q11 and Q13's accent fill, and Q28's underline, inside the menu (2026-10-28) |
| Q37 | Home, the game page and the screensaver follow Section 6's grammar (Section 7), kept recognisably Home (2026-10-28) |
| Q38 | Play and action buttons are soft cards, `r-action` 26 and `r-action-icon` 22 (chosen over the pill and over `r-card` 12); supersedes Q11 on these surfaces (2026-10-28) |
| Q39 | Focus outside the menu: Section 6's white ring with no glow or growth; cards and capsules keep a 4 px lift with a neutral shadow (chosen over ring only and today's look); supersedes Q1 there (2026-10-28) |
| Q40 | Home's feed tabs sit on a glass strip as `selected` slices (chosen over no strip); supersedes Q3 there (2026-10-28) |
| Q41 | One frost for every glass surface: the in-game frost's blur, .40 glass and calm curve, in CSS where Steam supports it (2026-10-28) |
| Q42 | Small secondary text on Home, the game page and the screensaver is `text-label` with `text-shadow`; supersedes Q29's "Home keeps `text-dim`" (2026-10-28) |
