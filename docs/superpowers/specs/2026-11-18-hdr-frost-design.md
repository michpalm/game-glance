# In-game frost on an HDR display — short design, step 1: SDR games (2026-11-18)

## Why

On the PS5 (HDR TV), the Game Glance menu over a game has no frost and no dim: it looks transparent. The backend refuses
the frost whenever Gamescope's output is HDR (`frost_prepare` → `unavailable: unsupported`), because the shader's maths
(blur weights, the calm knee at 0.45, the dim colour) assume SDR values.

## What Gamescope does (found 2026-11-18)

- The ReShade effect runs on the focused game's own image (layer 0) **before** Gamescope composites and converts colour
  for the display; its result replaces that image, and the normal conversion (SDR → HDR, PQ encode) runs afterwards.
- The effect is told the game image's colour space at compile time: `BUFFER_COLOR_SPACE` (ReShade's values:
  1 `srgb_nonlinear`, 2 `extended_srgb_linear` (scRGB), 3 `hdr10_st2084` (PQ)). Gamescope 3.17 on the PS5 has it.
- No HDR gate in Gamescope itself. (Read from Gamescope master; the caller details are a source summary, so step 1
  starts with a check on the PS5.)

So an **SDR game on an HDR display** hands the frost plain SDR pixels: today's shader is correct for it.

## Approaches

- **A, picked by Michael: SDR games first.** Step 1 (this design): frost on HDR displays for SDR game images, today's
  maths; HDR game images pass through untouched. Step 2 (later): an HDR path (decode to linear light, blur and dim
  relative to a ~203-nit reference white, encode back) for scRGB and PQ games.
- B: build SDR and both HDR paths at once. One step, but a colour problem would be hard to place.

## Step 1

- **Backend accepts HDR output.** `worker._context_supported` accepts `colorMode: 'hdr'` when Gamescope reports HDR
  (still: the page's mode must match Gamescope's); `shader.build_shader` builds for `'hdr'` too, the mode part of the key.
- **The shader branches on the game image.** `BUFFER_COLOR_SPACE == 1` (or not defined): today's frost and dim, unchanged.
  Anything else (scRGB, PQ, unknown): the picture passes through untouched, as today without frost. An HDR game can
  never get wrong colours from step 1.
- **Check on the PS5 first**: Battle.net (SDR) on the HDR TV: frost and dim appear, colours and brightness look as on
  an SDR display, nothing else on screen changes.

## Builder's calls

- The pass-through for HDR images is done in the final pass; the blur passes may still run (cost only while the menu is
  open).
- No change in the page: it already sends `colorMode: 'hdr'`.

## Non-goals (step 1)

HDR game images (step 2); the menu's look when frost is refused for other reasons (integer scaling).
