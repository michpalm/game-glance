# The way back: page to Home glide — design

Date: 2026-11-12. Status: built; the glide checked on the Ally 2026-11-12 (Spotlight, handheld).
Mock-up (Michael's Bazzite folder), animated from real Ally frames: `reverse-transition-options.html` (option B,
"Partial", chosen).

## Goal

Pressing B on a game page returns to Home with motion that mirrors the open: the parts both screens share glide back
to Home's places, instead of the page vanishing and Home fading in.

## Decisions (Michael, 2026-11-12)

| Question | Answer |
|---|---|
| Which way back | B, Partial: the shared parts glide; the cards fade out; the chips fade in; the game row rises. Not the full mirror of the open. |
| Page scrolled down at B | Today's fade. The glide runs only with the page at its top. |

## Today (unchanged as the fallback)

Steam remounts Home 50-70 ms after B. Home's `gh-back` state hides the leaving page at once (`steamEnterOffCss`), keeps
the art, and fades Home's title, chips, buttons and row in over `RETURN_TIMINGS.fade` (200 ms). Nothing moves.

## What you see

B on a game page at its top, opened from Home by the morph:

| When (ms after Home's first frame) | What |
|---|---|
| 0 | Home is there. Its title, eyebrow, Play pill, round buttons and pills (store, family, players) are drawn at the page's places and sizes. The art is steady. The leaving page is hidden at once, as on the plain way back. |
| 0-300 | Those parts glide to Home's places (`MORPH_EASE`). |
| 100-320 | The game row rises 70 px (`OPEN_TIMINGS.leaveDrop`) and fades in. |
| 120-320 | The chips fade in, rising 12 px. Home's info button (the page has none) fades in with them. |

Timings live in `motion.ts` as `RETURN_GLIDE = { glide: 300, rowDelay: 100, row: 220, chipsDelay: 120, chips: 200,
chipRise: 12, cap: 500 }`.

Home is live from its first frame: focus is restored as today, and A, L1/R1, Down and B work during the glide. A press
that changes the selection, opens a game or raises the feed ends the glide at once (everything at rest).

## When it runs

The glide runs only when all of these hold; otherwise, and on any failure, today's fade runs unchanged.

1. The page being left was opened from Home by the `morph` variant, with the Game Glance page look (Spotlight or
   Clean). Not a feed card's open, the Library, or Steam's own page look.
2. Home's restore selects that same game, in the recents or actions zone (not the feed).
3. The page was at its top when B was pressed.
4. The viewport is the size it was at the open.
5. Home could be measured on its return mount (`measureHome` non-null, canvas scale > 0).

## How it works

**Return note** (`src/home/returnNote.ts`, module state like `homeMemory`). `openGame` notes `{ appId, look, viewport }`
when it starts a morph. Home takes the note once on its return mount (`takeReturn`), which answers `'glide' | 'fade'`
by the rules above; "at top" is read then from the leaving page's own scroll position (the page stays mounted through
Steam's exit animation: a 200 ms delay, then 600 ms). Any other navigation away from Home (store, news, Library) clears it. Pure decision, tested.

**Home side.** A new root state, `data-gh-closing` = `from | to`, parallel to `data-gh-opening`. On the return mount,
once the content is up and before the first paint: `measureHome`, the same `pageTargets` and `openMotion` as the open
(so the page's places are the ones the open lands on), the `--gho-*` variables set on the root, and
`data-gh-closing="from"`: the shared parts carry the open's end transforms with no transition; the chips, the info
button and the row are transparent. After a forced style pass and one frame, `to`: the transforms go to none over
`glide`; the chips and row run their fades. When the last one ends (or a selection changes), the attribute and the
variables are removed. While `data-gh-closing` is set, `gh-back`'s own fade-in does not apply.

Only the transforms of the title slot, the eyebrow, the pills, the Play pill (its foreground, background layer, glyph,
label, arrow and size) and the round buttons (and their glyphs) are used. Not used: the text twins, the page focus
rings, the card shells and rings, the settle layers, the extras layer.

**Page side.** Unchanged: the leaving page is hidden at once (`steamEnterOffCss`). A first build kept its cards
visible, fading over 150 ms; the page sits above Home in the document, so the cards drew over Home's chips and row as
they came in (Michael, Ally, 2026-11-12), and the fade was dropped.

**Ending.** The glide ends at `data-gh-closing="done"`, not removed: while Home is still "just back" (`gh-back`, 1.5 s),
removing it let the plain way-back fade match again and replay over every part (a flash). Home removes `done` when
`gh-back` ends. At `done`, Play takes its own fill back without its 280 ms fill transition (it dipped), and with page
shading off the gliding fill is Home's own shade-none pill (it showed brighter, then settled).

## Checks on the Ally first (read-only recordings, with Michael's go-ahead)

Each can change the design, so they come before any build:

1. **The page is still drawn when Home mounts**, and Home paints above it. If Steam has removed it, or it cannot stay
   visible under Home, the cards are simply gone at frame 0 and the page-side change is dropped.
2. **Home's chips and pills are present on its return mount's first frame.** If they arrive later, the measurement
   waits for them up to one frame budget and otherwise falls back to the fade.
3. **The first frame does not pop.** Home's Play label and title are scaled to the page's size, so they are softer than
   the page's own text. If that shows, Home's shared parts fade in over the page's for the first 80 ms (the page's
   Play row then fades with its cards).

## Failure handling

Every step is guarded as the open's is: no note, a stale note, an unmeasurable Home, a missing page class or a thrown
error mean today's fade. The glide never delays Home's focus restore and never leaves `data-gh-closing` set (a cap of
`glide + 200` ms clears it).

## Testing

- `returnNote`: each rule, the single take, clearing, staleness (older than `RESTORE_MAX_AGE_MS`).
- The closing variables: the subset taken from `openMotion`'s output.
- The closing timeline with fake timers: from, to, done; ended early by a selection change; the cap.
- CSS guard tests: the closing block's selectors and timings; `gh-back`'s fade excluded while closing; the page
  variant hides everything but the cards.
- On the Ally (handheld and docked): the glide from the top of the page; a scrolled page fades; a feed card's page
  fades; a different game selected fades; A and L1/R1 during the glide; the family and player pills; the Clean look.

## Out of scope

- B during the open (the cancel) keeps today's fade back.
- Returns from news, the store, a feed card's page, the Library or Steam's own page look.
- The full mirror (cards shrinking onto the chips, stats flying back).
