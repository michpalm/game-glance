# Native Settings coverage corrections — 2026-11-06

Status: **installed and verified on the Steam Deck**. Final tested source `8e0eba2` (installed from documentation HEAD `a9b45ff`). The connection interruptions and intermediate findings below are historical; the final native pass at the end resolves them. The Ally was not accessed or modified.

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


## Resumed native validation and final geometry refinement

After Michael confirmed the Deck was awake, candidate `74483c7` was installed with a verified rollback backup at `/home/deck/gg-backup-native-settings-20261106-7kpdp01f/index.js`. The native pass identified an additional Storage drive-carousel edge overflow. Candidate `70c1333` contained it while retaining inner horizontal scrolling, with immediate predecessor backed up at `/home/deck/gg-backup-native-settings-20261106-k30wv5u2/index.js`. Independently observed installed digest for `70c1333`: `f4ff81769b6240c7824c346ae0fb0ecb37b98811cb3f2bbefb5645936a08b9d6`.

That installed candidate passed all 25 categories, 260/260 detected native fields themed, and 61 scroll positions without detected text crossing the pane/sidebar or unintended page-level horizontal overflow. Five startup movie cards were themed; native focus on first/middle/last stayed inside the pane with no root transform, and selection indicators were unchanged. Both calibration sliders were themed mint, focus-visible, value-preserving and footer-safe. Native B first exits direct slider adjustment focus, then returns to Display and removes calibration decoration. Four dropdowns passed theme/alignment/cancel/focus/value checks. All 25 category transitions contained zero unthemed frames across 1,002 samples. First/last sidebar categories remained reachable/visible.

A final visual comparison exposed two gaps in the earlier geometry checks: the inner category contents still animated and retained native icon margins, causing an awkward wrapped Customization caption, and fixed-position calibration controls could cover part of the expanded preview frame despite its image/style identity remaining unchanged. Locally tested refinement `8e0eba2` removes inner sidebar zoom/icon margins, allows long row captions their natural height, and keeps calibration controls in normal flex flow above reserved footer space. Its preview wrapper flexes into the remaining space without filtering or replacing the image. Browser regressions explicitly reproduced row-bound clipping and preview/control overlap before correction, then passed at all three sizes. The full suite remains 263 files/2,852 tests, types/build/whitespace green.

The Deck dropped offline again before `8e0eba2` could be staged; the install was stopped at preflight. The full candidate must still be installed and the stronger row/preview bounds checked natively before completion. Temporary normal-input keep-awake is prepared for the final test session, rather than changing sleep preferences. The Ally remains untouched throughout this work.


## Final accepted Steam Deck pass

After the second wake confirmation, temporary time-bounded normal mouse input kept the Deck active without changing sleep preferences. It was explicitly stopped at completion. Final source `8e0eba2`, documentation HEAD `a9b45ff`, installed frontend SHA-256 **`7858bf2948423ee5449f0ace82c430bf40e69f3171cacb19116c65299c346339`**; independently checked after reload. Immediate predecessor backup: `/home/deck/gg-backup-native-settings-20261106-gq37e1s8/index.js` (the `70c1333` build). The original pre-pass frontend remains backed up at `/home/deck/gg-backup-native-settings-20261106-7kpdp01f/index.js`, SHA-256 `1f01738db0770beb0c63ee5ba457e89949094a0824cc0bc20d99ccc8ac564c54`. No backend or stored setting changes.

Final native checks at actual 1280×800 handheld display / approximately 854×534 CSS viewport:

- All 25 categories inspected, 255/255 currently detected native fields themed and 61 scroll positions checked. Field counts vary with native loading/conditional rows; this count is the final observed state, not a replacement catalogue. No detected visible text crosses its content pane, sidebar, or own category row. No unintended page-level horizontal overflow; Storage retains bounded inner drive scrolling.
- Customization's five startup choices receive VDL surfaces, label/description styling and check accent. First/middle/last native card focus stays within the pane without root zoom; selection indicator snapshots remain unchanged. Final visual capture confirms Customization is one line inside its category row: row 44px, caption/content 20px, icon margins zero.
- Display Colors' two sliders use the mint accent, preserve values, stay focus-visible and clear the footer by 8px. The calibration preview has no filter, retains its source/style identity, and now ends exactly where the controls begin (approximately 340.61px); no control overlay obscures it. Native back exits slider focus then returns to Display and clears calibration markers/styles.
- Four native dropdowns (Audio, Display, Downloads, System) pass owned styling, right alignment, B cancellation, focus return and unchanged value snapshots.
- All 25 category transitions contain zero unthemed frames across 1,004 samples. First/last category focus is reachable and visible.
- Exiting to Home removes every owned shell, field/part/choice/scroll marker, calibration page/preview/section marker and stylesheet. Re-entering Customization restores styling and artwork-backed frost. Final readback: loaded plugin, Customization, no side menu or running games; scratch audit globals removed.
- Fresh local checks on the final source: 263 files / 2,852 tests passed; typecheck/build/whitespace passed. Browser cases include 24 normal Settings cases and 3 calibration sizes, with additional native-margin/focus-zoom, long category caption, Storage overflow, and unobscured-preview regressions observed RED→GREEN.

Final artifacts: this chat's `settings-handheld/coverage-pass/native-*-final.json`, `installed-build-final.json`, `customization-final.png`, `display-colors-final.png` and fixture captures. Earlier `*-after.png` files describe intermediate findings and are superseded by the final captures.

These are the current mounted native category states plus the explicitly tested calibration subpage. Unmounted hardware/account-specific options, future Steam versions, subjective physical-controller/touch comfort and measured performance are not established by this pass. No destructive settings actions or alternate startup movie selections were invoked. For rollback, close side menus/keyboard, restore the verified original Deck backup, verify its digest and reload through Decky while preserving backend and saved settings. No push, PR, release or Ally installation occurred.
