# Native Settings coverage corrections — 2026-11-06

Status: reviewed local candidate, **not installed or accepted on-device yet**. Michael requested a category-by-category audit on the Steam Deck after reporting unthemed Display Colors and Customization video choices, enlarged styling and sidebar text clipping. The Deck became unreachable after the initial native diagnosis. Installation and the full native pass remain pending until it is awake and connected. The Ally was not accessed or modified.

## Native diagnosis completed before disconnection

- Display's Adjust Display Colors button opens the separate `/colorsettings` route, outside the existing `/settings/...` presentation lease. Its two native calibration sliders and preview were identified without changing values.
- Customization's startup movie choices are native form fields whose text has no generated `_Label` id. The previous labelled-row inventory missed them despite marking their containing section. Their whole-field surface, preview, caption and native radio-group relationship were inspected; no different movie was selected.
- The Customization sidebar caption visibly crossed its column. Nested native captions can keep their own font size and `white-space:nowrap`, overriding the previous outer wrapper rules. A focused native-shaped card can likewise zoom beyond its pane.
- Before images and structural probes are in this chat's `settings-handheld` directory: `customization-before.png`, `display-colors-before.png`. Structural probes collect classes, roles and geometry rather than private account/network/Friends contents.

## Local corrections

Use the live Steam class mappings exposed by Decky's `gamepadDialogClasses` and `gamepadSliderClasses` to identify native fields and text/slider parts, including fields without generated label IDs. Do not save hashed class names. Exclude compound wrappers that contain separate fields so entire collections do not become oversized cards. Preserve each native control, handler, selected value and preview.

Mark and theme individual startup movie choices, captions and native check indicators. Allow long and unbroken text to wrap within a shrinking label column, constrain preview/value columns, and keep focus geometry fixed. Apply the same mapping throughout native Settings rather than hardcoding only Customization. Constrain nested sidebar text and icons independently so a long caption cannot cross into the page.

The exact `/colorsettings` route receives a separate disposable presentation for its verified control panel and two sections. It shares measured footer clearance and VDL text, glass surfaces, focus and slider colors. **The calibration image is not replaced, filtered or included in the decorative backdrop.** Unknown page/class structures remain native. The current Home/game artwork context survives a trip through calibration and returning to Settings. Native B/back behavior remains Steam's.

## Fresh local evidence

- `pnpm test`: **263 files / 2,852 tests passed**.
- Native Settings subset: **53 tests**, including ID-free movie fields, compound wrapper exclusion, native field/slider class contracts, missing mappings, deferred calibration resolution, route lifecycle and artwork retention, preview/value identity, cleanup, and malformed calibration structures.
- `pnpm typecheck`, `pnpm build`, `git diff --check`: passed.
- Browser checks: **24 Settings fixture cases** at 828×466, 1280×800 and 1600×900, plus **3 calibration cases** at those sizes. Actual text-range bounds check sidebar labels and long movie filenames. Focused media cards stay inside their pane without scaling. Calibration preview styling is unchanged and the last focused slider remains inside the control scrollport without a value change.
- A fresh read-only independent code review found no Critical or Important findings. Three minor coverage gaps were addressed: native class resolution, calibration focus bounds and malformed calibration discovery. Its attempted test run was blocked by a read-only cache path; the successful executions above were run by the primary agent with the required workspace access.

The browser cases are native-shaped fixtures, not proof of native rendering, physical controller/touch behavior or performance. The reviewer also declined to judge those live properties; they remain required in the next device pass.

## Pending Steam Deck pass

The current recorded Deck frontend remains source `059f70a`, SHA-256 `1f01738db0770beb0c63ee5ba457e89949094a0824cc0bc20d99ccc8ac564c54`. No replacement was staged while the device was unreachable. Multiple SSH attempts reported timeout/Host is down; CEF disconnected. Michael was asked to wake it and leave Gaming Mode on Wi-Fi. No native settings writes were made in diagnosis.

Once connected: close side menus/keyboard, verify the current digest, save and verify a rollback copy, install the candidate, reload through Decky and allow remount. Revisit every category from top to bottom, inspect all runtime-mapped fields rather than only ID-labelled rows, measure visible text/scroll/focus bounds, and capture the special Display Colors and Customization views at equal native scale. Check startup selection/value snapshots, calibration preview/value preservation, first/last navigation, dropdowns, category transitions, suspension, route exit and unload cleanup. The audit expression is preserved at `scripts/fixtures/native-settings-live-layout-audit.js`; run it only against the authorized test device with the normal preflight guards. It navigates and scrolls but does not activate controls or export text values.

Do not claim this candidate fixes every native component or install it on the Ally from local checks alone. Record the final installed commit/digest, backup, category/component evidence and remaining limitations after native validation.
