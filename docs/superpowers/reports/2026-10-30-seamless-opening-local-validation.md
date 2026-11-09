# Seamless opening — local correction candidate

2026-10-30. Base `afe3a8a`, branch `codex/social-chat`. User reports regression during Home → game page opening: eyebrow glow, artwork, footer buttons and frosted cards settling/flickering. Seamless opening is the priority. User also requested the lighter VDL/menu glass appearance.

## Confirmed causes and changes

- The page inner container transitions the registered `--glance-accent` when the game accent stylesheet mounts. A local browser reproduction shows the eyebrow using an intermediate colour and a running accent transition. Arrival CSS now suppresses that transition during the hidden/revealing handoff, applying the known game accent immediately. Normal page accent transitions remain intact outside arrival.
- The frozen Home bridge referenced `#gg-calm` without owning its lifetime. After the last Home filter owner releases, no filter exists until the page acquires it. Regression tests reproduce the missing filter. The bridge now owns one reference through its removal, covering cards, buttons and footer frost. Cancellation and overlapping page ownership are covered; removal is idempotent.
- None shading hardcoded `.60` glass, while standard VDL uses `.40`. Both Home/copies and the page now read `TOKENS.glass`; label shadows and contrast edges remain. The page cloud button also receives the same None edge rule as Home, removing its inconsistent handoff.

## Verification

- Regression checks observed failing before fixes, passing after.
- Full frontend: 220 files / 2,508 tests passed.
- TypeScript check passed; Rollup production build passed.
- Local browser runs production Home/page/arrival CSS at d=.575 and d=1.043, both Bottom half and None, before and after (eight samples). All four corrected samples have matching Home/page cloud and card tints and no active accent transition; original samples reproduce the accent warm-up in both modes and cloud mismatch in None. No captured browser errors. This isolates paint styles; it does not mount Steam's actual page, focus or compositor.
- Independent read-only source review found no actionable defect after the final scope correction below.
- Frontend SHA-256: `f8390120a024e2ed744db71ed86ff24fbb04922d5fcea9bef7de029fe2906248`.

## Scope and limits

A proposed Play-shadow unit change was discarded before completion: the pseudo-element is already inside Home's scaled canvas, so the original canvas-pixel shadow correctly scales into page units. No product change to that path remains.

No Ally access, installation, reload, restart, navigation, screenshots of private content or message sends occurred. No push/PR/release. Frontend-only candidate; no Python changes.

Actual artwork brightness, eyebrow continuity, footer pills and Chromium frost repaint during the full transition still require an approved Ally trial. Automated checks do not establish that all reported flicker is gone. Validate opening/back repeatedly with both shading modes and Fill/Fit, normal/Clean cards, expanded controls enabled/disabled, on handheld and docked as available. Capture only the game-page transition; avoid Friends/private content. Install only with the menu closed, back up and checksum-verify the current frontend, then reload through the existing guarded path. No restart required for these frontend changes.

## Approved Ally installation

Michael explicitly approved “install it.” The frontend candidate above is now installed. Menu closed was confirmed before transfer and again immediately before replacement. Staged SHA-256 matched the checked candidate; the previous installed baseline `f5d899753da603e9f90b88974b1088bfc9928403289f014f827b2d9bdb8f9755` was verified unchanged and backed up at `/home/deck/gg-backup-seamless-opening-20261030-jzjkzvqe/index.js` with its original checksum. Replacement was atomic. The guarded frontend reload was requested successfully; a separate post-reload read confirmed Game Glance loaded, menu closed and installed SHA-256 `f8390120a024e2ed744db71ed86ff24fbb04922d5fcea9bef7de029fe2906248`. No restart, settings change, navigation or message send. User visual acceptance of the full opening remains pending.

## Follow-up: dim eyebrow and Select flash

User reports the installed candidate looks better, but the eyebrow dims on the page and footer Select briefly highlights.

Read-only Ally CEF inspection confirms page eyebrow and all ancestors opacity 1, text white, intended text shadows, but computed overflow-clip-margin 0px. CEF rejects calc(24 * 1px) for this property; variable-containing calc passes parse-time support but fails after substitution. Plain 2em is supported. Shared EYEBROW now uses 2em, exactly the intended 24 design units at its 12-unit font, for Home, page and twins.

During the user's requested repeat, a 30-second read-only rAF sample caught Select disappearing at 4085ms, returning at 4223ms with a native background-color animation from transparent to .40 glass, and settling by 4396ms. No hover, inline style or class highlight was involved. Shared owned footer group CSS now disables native transitions with transition:none!important. This addresses the bright transparent-to-glass phase; Steam's own removal/readdition remains outside this fix.

Regression expectations failed before both corrections. Final full frontend suite: 220 files / 2,509 tests passed. Typecheck, production build and diff check passed. Independent source review found no product defect; its stale test expectation finding was corrected before final checks. Local production CSS browser fixture at d=.575,1.043,1.5 confirms page and twin clip margins match at each scale, Home retains 24 canvas px, and recreated footer groups have immediate .40 glass with zero active animations. Actual CEF rendering and any residual Select disappearance need device acceptance after installation.

Follow-up frontend SHA-256: `810315d15b9fed1a8e7d76ff6167d6f7acd1491c1700a0e510da799dd304e7e7`. Not installed in this follow-up. No navigation, settings change, backend change or message send by the agent. User performed the repeat navigation.

### Follow-up installed with explicit approval

User approved “install”. Verified local candidate and installed baseline; menu closed before staging and immediately before replacement. Backed up prior f8390120a024e2ed744db71ed86ff24fbb04922d5fcea9bef7de029fe2906248 frontend at `/home/deck/gg-backup-seamless-followup-20261030-64umr00l/index.js`. Staged and atomically replaced with 810315d15b9fed1a8e7d76ff6167d6f7acd1491c1700a0e510da799dd304e7e7; guarded frontend reload succeeded. Independent post-reload checksum matched; plugin loaded and menu closed. No reboot, backend/settings change or navigation. User visual acceptance pending.

## Second follow-up: moving card frost and eyebrow ownership

User confirms footer issue solved. Eyebrow still changes brightness/glow (position correct), and card frosting is noticeably late. Installed baseline remains 810315d15b9fed1a8e7d76ff6167d6f7acd1491c1700a0e510da799dd304e7e7.

Read-only Ally capture during user navigation (temporary paint-followup-sample.json) confirms a single calm filter throughout, correct clip margin, identical twin/page font, glow, accent and terminal rect. It also shows two overlapping eyebrow renders during morph: Home .887/twin .416 at 4222ms; .585/.774 at 4269ms. A second rapid return/open leaves original opacity1 as twin fades in, until bridge creation. Source confirms return animation!important can override normal opening fade while gh-back remains for 1500ms.

The moving normal card's frost lives on ::before beneath a flat parent; bridge and page apply it directly to their cards. A checkerboard browser reproduction shows sharp stripes through the nested surface despite computed blur, while card preserve-3d or direct surface blurs correctly. Repeated using production homeCss plus calmFilterMarkup: baseline nested surface sharp, experiment and bridge blurred. Rebuilt production CSS with the preserve-3d repair and removed experimental override: all three surfaces blurred. This establishes a Chromium rendering difference, not a general claim that all stacking contexts are backdrop roots.

Corrections in homeCss: live normal-card parent preserves the rendering scene; eyebrow original is hidden and page-sized twin kept fully visible from the opening's first frame, retaining its transform path and settle glide; return animation excludes opening roots so rapid reopening owns its animation. Footer code unchanged in this follow-up.

Three regressions observed failing before changes, green after. Full suite 220 files / 2,512 tests passed; typecheck, Rollup build and diff check passed. Production CSS motion fixture tested normal/rapid return × both shading modes × d=.625/1.043, about64 frames each: original opacity0, twin1, no opacity animation throughout, expected movement retained. Independent review found no actionable defects, including cancellation and synchronous first-frame ownership.

Candidate SHA-256: `593189be45001a53e595150ffb68017438a785b92a373328acc55d6ca7ee1e4f`. Not installed. Source Home text is rasterized at12px then scaled; twin/page rasterize at final font size. Removing the overlapping fade addresses measured halo composition, but does not prove pixel-identical raster at initial press. Actual Ally frost continuity, eyebrow acceptance, and performance still need approved installation and user trial. No navigation or settings writes by agent; no backend changes, commits, push, PR or release.

### Second follow-up installed with explicit approval

User approved “go ahead”. Menu closed verified before staging and again before replacement. Installed baseline810315d15b9fed1a8e7d76ff6167d6f7acd1491c1700a0e510da799dd304e7e7 backed up to `/home/deck/gg-backup-paint-continuity-20261030-8f25i69m/index.js` plus original checksum. Stage validated and replacement atomic. Guarded frontend reload requested successfully; independent postreload checksum593189be45001a53e595150ffb68017438a785b92a373328acc55d6ca7ee1e4f matched, Game Glance loaded and menu closed. No restart, backend/settings change or navigation. User visual/performance acceptance pending.

## Third follow-up: final eyebrow raster handoff

User confirms cards now look very good; eyebrow alone still pops, specifically at the end. Initial capture timed out before user repeat; no data was obtained. Rearmed a long-lived read-only sampler and user repeated again. Successful capture stopped automatically, writing only cropped eyebrow/art pixels and typography/ancestor metadata to private temporary files (eyebrow-bridge.png, eyebrow-page.png, eyebrow-handoff.json). No navigation by agent.

Captured bridge before page existed, with every ancestor opacity1. Final page and bridge match exact DOM and Range text rectangles, font, shadows, smoothing, rendering and stroke. Pixel crops visibly differ: mask of759 bridge-white glyph pixels averages ~252 per RGB channel in bridge versus ~227 in final page. Best geometric alignment is zero shift; +/-1 pixel worsens comparison. Page has titleblock ancestor translateY(-106.809px), whereas bridge uses a direct text twin. This is evidence of raster/compositing differences, not a color or opacity mismatch.

Private local repro uses Steam's actual bold font obtained read-only from its existing font endpoint. At identical measured text bounds, the transformed page hierarchy differs markedly from the bridge; replacing its parent transform with bottom layout anchoring closely matches the bridge. Screenshot comparison mean RGB error against bridge: transformed page15.56 versus layout-anchor .61 (lossy local screenshot; the latter is near JPEG noise). The diagnostic is not a pixel-perfect reproduction of Linux CEF.

Correction: restyled page titleblock uses top:auto and bottom:calc(100% - var(--gg-play-top) + layoutGap), transform:none, rather than top:playTop-gap plus translateY(-100%). Same algebraic bottom anchor, variable title/metadata heights continue growing upward. Clean uses its28-unit gap; standard36. Explicit z-index0 retains former zero-level stacking context. No changes this iteration to accepted frost/footer code.

Three existing anchor assertions were updated and observed failing before the repair, green after; scoped stacking assertion now accounts for our own titleblock. Full220 files /2512 tests passed, typecheck, production build and diff check passed. Production CSS browser geometry comparison:32 before/after pairs across standard/Clean, d=.625/1.043, containing heights466.38/1300.25, short/long title, logo and wrapping metadata. All pass, maximum coordinate delta .0078125 CSSpx. Independent review found no new actionable defect. Pre-existing arrival mode'all' titleblock rise is still overridden by the more specific base important transform; no claim to fix or newly regress that path.

Candidate SHA256 `39dbaa6be4fd265cfd7f8efdd89d2b8829161d010599ddf1472cb2b67a89a97e`. Not installed. Actual Ally handoff pixel continuity and title/logo visual acceptance remain to be checked after explicit install approval. Installed baseline remains593189be45001a53e595150ffb68017438a785b92a373328acc55d6ca7ee1e4f. No backend/settings changes, commits, push, PR or release.

### Third follow-up installed with explicit approval

User approved “install”. Menu closed confirmed before staging and immediately before replacement. Baseline593189be45001a53e595150ffb68017438a785b92a373328acc55d6ca7ee1e4f backed up to `/home/deck/gg-backup-eyebrow-anchor-20261030-7mtjnnd5/index.js` plus original checksum. Stage and replacement verified as39dbaa6be4fd265cfd7f8efdd89d2b8829161d010599ddf1472cb2b67a89a97e. Atomic replacement and guarded frontend reload succeeded. Independent postreload checksum matched; plugin loaded, menu closed. No reboot, backend/settings change or navigation. User acceptance of the eyebrow handoff remains pending.
