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

---

# Step 2: true HDR games (2026-11-18)

## What changes

The shader reads the game in two helpers only (`Box`, `Box4`, every blur's input) and mixes everything in `Composite`.

- **In:** `Box`/`Box4` convert each HDR sample to SDR values (`ToSdr`): decode (scRGB: linear, 1.0 = 80 nits, Rec. 709;
  PQ: ST 2084 to nits, BT.2020 → Rec. 709), divide by the reference white, compress highlights above it softly into
  0–1, encode as sRGB. All of today's blur, calm and glass maths then runs unchanged.
- **Out:** in `Composite`, the frosted areas, the blurred dim and the dim colour are converted back (`FromSdr`: sRGB
  decode, × reference white, back to the game's encoding) before they are mixed with the game.
- SDR game images: both conversions are the identity (compiled out), so step 1 is untouched.

## Choices

1. **Under the glass, HDR highlights are compressed to SDR** (recommended): the frost looks the same as over an SDR game,
   and a sun or explosion behind the menu cannot glare through and wash out its text. (Alternative: keep HDR under the
   glass; brighter, but text over bright scenes is harder to read.)
2. **Reference white: 203 nits** (recommended; ITU-R BT.2408's reference for SDR white in HDR, what most HDR games use for
   their own menus). (Alternative: follow Gamescope's SDR brightness setting, which needs reading another Gamescope value.)

Outside the glass, the dim mixes in the game's own encoding, so the game keeps its HDR highlights there (dimmed like now).

## Check

On the PS5 with a game that renders HDR: the frost and dim look like over an SDR game, no colour cast, no banding in
dark gradients, and the game outside the menu keeps its HDR highlights. Step 1's SDR path is re-checked over Battle.net.
