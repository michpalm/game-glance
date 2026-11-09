# Page shading design

Written 2026-10-30 from Michael's Ally comparison (Home with and without the edge shading, hero on Fit and on Fill). Status: approved ("Yes, build it").

## Why

Home and the game page share five gradient layers over the art (themeCss `STEAM_TOP_GRADIENT` and `PAGE_SCRIM_LAYERS`): Steam's 75 px top shadow, two left scrims and two bottom scrims. They came from matching Steam's game page early on. Every element now sits on glass with label shadows, so most of the shading is no longer needed; Michael wants the art clear, optionally keeping a darker base behind the cards.

## Behaviour

- New setting **Page shading** in the settings panel, directly under **Hero** (Fill / Fit), a dropdown with two options:
  - **Bottom half** (default): only the two bottom scrims (`HANDOFF_SCRIM_BOTTOM`, `SCRIM_BOTTOM`), darkening from about the middle down. No top or left shading.
  - **None**: no shading layers at all.
- Both modes apply to Home and the game page together, so the open transition (Home's `.gh-scrim-page` against the game page header's `::after`) stays identical on both sides:
  - Home: `.gh-scrim-page` draws the mode's layers (Bottom half: the two bottom scrims; None: nothing).
  - Game page (our restyle, spotlight layout and the 1.1.1 layout): the header's `::after` draws the same layers.
  - Steam's own top shadow on the game page (header class map key `TopGradient`, module 4527) is hidden in both modes; Home no longer draws `STEAM_TOP_GRADIENT`.
- The flat dim under the feed sheet (`.gh-scrim-dim`) is unchanged.
- Settings saved before this feature load as Bottom half; unknown values fall back to Bottom half.
- Copy: setting label "Page shading"; options "Bottom half", "None"; descriptions: Bottom half "A soft shade behind the games and cards, none at the top." None "The art stays clear to every edge."

## Rules

- One source of truth: a function in themeCss returning the layers for a mode (`pageScrimLayers(mode)`), used by Home and the game page.
- No Steam functions; the top shadow is hidden by its class from the existing header class map.

## Contrast in None mode (added 2026-10-30)

Michael's Ally check of None mode (30 frames, Pico Park, Snufkin, Overcooked 2, Observer, CULTIC): text and buttons clash with the art. Picked after live previews on Snufkin and CULTIC. Applies only while Page shading is None (Home root `.gh-shade-none`; the game page CSS built with `pageShading: 'none'`); Bottom half keeps today's look.

- **Eyebrow** ("LAST PLAYED · …", Home, game page and the open-transition twin), **in every mode** (Michael, 2026-10-30: "always present", whatever the art): white text; the game accent only as a glow; its box clips with a 24 px clip margin so the glow is not cut into a band. Glow: `text-shadow: 0 0 2px #000, 0 0 4px <accent>, 0 0 10px <accent>, 0 0 20px color-mix(in srgb, <accent> 75%, transparent)`. No chip behind it; no accent anywhere else in this pass.
- **Glass on the art** (Home stat chips, round buttons, source/Steam pill, family pill; game page round buttons, source pill, description and HowLongToBeat cards, the "Online" player-count pill): background `TOKENS.glass` (`rgba(12,16,22,.40)`, restored to the standard VDL tint on 2026-10-30 after Michael found the stronger tint too dark), edge `rgba(255,255,255,.16)`, white text.
- **Chip labels and values**: `text-shadow: 0 1px 3px #000b`.
- **Play and Library pills**: background `color-mix(in srgb, <accent> 88%, #000)`, border `rgba(0,0,0,.35)`, `box-shadow: 0 0 0 1px rgba(0,0,0,.25), 0 6px 18px -8px rgba(0,0,0,.8)`, label `text-shadow: 0 1px 2px #0009`.
- No extra shade layer: Home and the game page keep drawing identical (empty) scrims so the open transition is unchanged.
