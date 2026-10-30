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
