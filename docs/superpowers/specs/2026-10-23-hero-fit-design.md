# Hero art: Fill and Fit — design

2026-10-23. Status: design approved in chat; spec awaiting review. Branch `feature/3.6-hero-scale-whatsnew` (after 3.5.0).

## Problem

Steam's hero art is about 3.1:1 (Home draws a 1920×620 copy). On the Ally's 16:9 screen Home and the game page fill the screen with it (`cover`): it is stretched 1.745× to the screen's height and only the middle 57% of its width shows (measured on the Ally, 2026-10-22). The sides of the scene are lost and the art looks soft.

## Decisions (with Michael, 2026-10-22/23)

- Two modes, one global setting: **Fill** (default, today's look) and **Fit** (the whole art).
- Fit: the art at the top, its edge fading into a blurred copy (option C of four variants rendered on the Ally; centred and hard-edged variants rejected).
- The blur is the Visual Design Language's new `art-fill` token: `blur(42px) saturate(1.25) brightness(.8)`, Home's existing hero fill (`design/visual-language` e2ba1dc). On 16:9 the four strengths compared looked almost alike (the fill sits behind the cards); 16 px left the art's shapes legible.
- Applies to Home, the restyled game page (its normal and Clean looks, which share the hero image) and the open transition; the screensaver and the 1.1.1 page look keep filling the screen.
- Checked on the game page too (rendered on the Ally, 2026-10-23, both looks): with Clean look off the art's fade lands where the cards start, as on Home; with Clean look on the lower ~43% is blur under the logo, Play row and stats. Michael keeps Fit in Clean look as shown.

## Setting

- `Settings.heroFit: 'fill' | 'fit'`, default `'fill'`; unknown stored values read as `'fill'`; `settings.setHeroFit()`. The 3.5 settings preservation keeps the field across version switches.
- Quick Access → Game Glance → Spotlight Home (`components/SettingsPanel.tsx`), after Games row style: **Hero art**, a dropdown with **Fill** — "Fills the screen; the sides of wide art are cut off." — and **Fit** — "Shows the whole art at the top, with a blurred copy behind it."

## Look in Fit

- The art is drawn as large as possible while entirely visible, anchored at the top centre (`contain`, positioned `center top`). For 3.1:1 art that is full width at the top.
- Behind it, the same art covering the whole hero box with the `art-fill` filter, drawn larger than the box so its blurred edges stay outside the screen.
- The art's edge next to the fill fades to transparent over the last 22% of the art's extent on that axis (its height for wide art, about 140 device px on the Ally; its width for art taller than the screen's shape, on both sides). Pure function `fitFade(artAspect, boxAspect)` decides the axis and the fade's start and end as fractions of the box.
- Everything else is unchanged: scrims, logo, stats, Play row, cards, status bar.

## Where

- **Home** (`home/HeroBackground.tsx`, `home/homeCss.ts`): the full-art hero (`.gh-hero-full`) gets a `gh-hero-fit` modifier in Fit, drawing the fill and the faded art as two layers. The fallback for games without hero art (`.gh-hero-blur` + `.gh-hero-sharp`) is unchanged.
- **Restyled game page, normal and Clean looks** (`styles/themeCss.ts`, `components/GameHero.tsx`): Steam's header image (`TopCapsule img`, a full-screen `<img>` with `object-fit: cover`) takes the same framing in Fit (`object-fit: contain`, `object-position: center top`, the same mask), and `GameHero` draws the fill layer under it from the same art url (the image's `currentSrc`), with the image above the fill. The page's framing and Home's are equal in both modes.
  - Fit must replace the restyle's existing `${topCapsule} img { object-position: 50% 30% !important }` (themeCss), not add a weaker rule beside it: left in place, it pushes the contained art down by 30% of the leftover height (about 138 device px on the Ally; seen in the first page mockup).
- **Open transition**: the morph keeps Home's hero still and hands it to the page's, so equal framing is enough. The other game's fade-in (`.gh-hero-open`, `--gho-hero`) uses the current mode too.
- **Not changed**: the screensaver (`.ggs-art`) and the 1.1.1 page look (Spotlight Home off).

## Testing

- Unit: settings default, read, write and unknown values; `fitFade` for wide, exact and tall art; Home CSS for both modes; page CSS in the restyled looks only (the 1.1.1 output stays identical); `.gh-hero-open` in both modes.
- Ally: screenshots of both modes on Home and on a page; a frame recording of the open transition in Fit, compared against the gear circle as for #64; a heroFade open from a feed card.
- 16:10 (the Deck's shape) on the Ally through the viewport emulation script (`scripts/cef-viewport.mjs`) while the Deck is unreachable.

## Not in scope

Per-game choice, automatic choice by art shape, the screensaver, and moving other blurred artwork to `art-fill` (a VDL follow-up).
