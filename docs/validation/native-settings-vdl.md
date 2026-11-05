# Native Settings VDL validation — 2026-11-05

Status: installed on the Ally with explicit approval, source candidate `dcd1d18` on `release/4.0`. The temporary Audio preview was removed. Installed structural/navigation checks passed; physical usability, Steam Deck hardware and performance acceptance remain pending. No push, PR or release.

## Result

Steam owns the category list, content, controls, bindings and navigation. The presentation shares the existing master/custom-menu opt-in. It narrows the sidebar, measures the actual header and both footer cards, bounds verified native scrollports, and applies VDL surfaces over attributable Home/game artwork. No screenshot background is used by production code. Missing artwork uses a neutral surface; unknown native shell structures fall back to native presentation.

## Fresh local verification

- `pnpm test`: 261 files, 2,834 tests passed.
- `pnpm typecheck`, `pnpm build`, `git diff --check`: passed.
- Browser checker: 21 cases, zero page errors, at 828×466, 1280×800 and 1600×900. Audio, long descriptions, dense content, Storage, Downloads, loading and disabled states; 25 categories retained, eligible rows at least 44px, bounded page/sidebar scrollports, last focus visible above both footer cards, checkbox geometry, portal dismissal, bright and neutral backgrounds.
- Marker-only footer movement was separately observed after initial ResizeObserver callbacks settled: the panel shrank by 18px without a DOM replacement or class/style mutation.

Reproduce fixtures using `node scripts/native-settings-preview.mjs <asset-directory>` and then `node scripts/check-native-settings-preview.mjs [output-directory]`. The asset directory supplies `device-frame.png`; Playwright is provided by existing developer tooling via `PLAYWRIGHT_MODULE` and optional `CHROMIUM_PATH`. These are development fixtures, not product dependencies. Browser DOM focus does not establish Steam controller or touch behavior.

Local visual artifacts are in this chat's `settings-handheld` visualization directory: stock/hybrid comparison at the same handheld size, `production-*.png`, `production-checks.json`, `candidate-ally-audio.png` and `candidate-native-checks.json`. No private account, network or Friends data is intentionally exported.

## Native Ally source validation

Temporary compiled production presentation/runtime modules were evaluated in Steam's existing main document. This did not replace the installed plugin bundle. It exercised the actual native DOM and artwork captured from the currently displayed Home hero, not a screenshot. The activation host's account/opt-in integration is covered by mounted local tests, not by this source injection.

The current docked/scaled Steam viewport was 1500×844 CSS pixels; UI scale was not changed. All 25 native categories retained the same sidebar and were visited through native sidebar entries. Each styled page stayed bounded and footer-safe. Steam's virtual controller dispatcher traversed from the first to last category; the final category and its focus outline were visible. Focusing a last eligible native control on System, Display, Storage, Notifications, Downloads, Game Recording and Audio kept focus inside the panel, with unchanged role value snapshots.

The native output picker opened with A, B cancelled, focus returned, and control values were unchanged. **Its popup retained native styling:** Steam advertised `aria-controls` pointing to an absent DOM target. The presentation deliberately requires a verifiable relationship before styling an external popup. Explicitly associated pickers, including controller activation without a bubbling DOM event, have regression coverage; unprovable portals remain native. This is a visible limitation, not full native-popup styling acceptance.

The temporary candidate's markers, styles and decorations were removed. The original Audio-only preview was recreated; final readback reported Home, preview active, plugin loaded, and no running games. No deliberate slider/device setting writes or games were launched. Native structural and programmatic navigation checks are not physical-controller, touch, Steam Deck hardware or performance acceptance.

## Whole-change review and one fix pass

One fresh-context whole-change review returned five Important findings. All were accepted and reproduced before correction; no second reviewer pass was dispatched.

| Finding | Regression and correction |
| --- | --- |
| Account/source stale artwork | `artOwnership.test.ts` and mounted host account swap: reject stale Home publication and changed source lists; account-scope memo and opaque custom-image decode URL context. RED→GREEN. |
| Unfamiliar scroll owner could clip content | Discovery rejects absent/unknown scrollports; presentation bounds verified intermediate page hosts. Native long System page exposed an intermediate host; fixture and native retest passed. RED→GREEN. |
| Unrelated/reused portal could receive Settings styling | Require explicit ARIA ownership, release hidden/closed/re-associated portals; plain actions cannot claim unrelated focused portals. Controller-only explicit picker regression added. RED→GREEN. |
| Mixed action row could imply one focus target | Exclude rows with additional independent actions from compact standard-row styling. RED→GREEN. |
| Footer ownership-only mutations could miss geometry refresh | Observe existing footer ownership/side/edge markers and inert state. Real browser marker-only mutation RED→GREEN. |

Native validation also exposed an oversized sidebar child scrollport. Discovery now requires the verified single child and CSS bounds that child; the browser fixture reproduced it before correction. Native traversal then reached the last of 25 categories with the focus ring visible. The final full suite, types, build and browser checks above ran after the fix pass.

The existing isolated plugin lifecycle fixture needed a NativeSettingsHost mock, matching its existing ChromeHost isolation; it then passed with the full suite.

## Decisions and remaining acceptance

1. Installation stays a separate authorization for this concrete candidate. Cost: one installation approval and subsequent installed-build validation.
2. Artwork context includes a source revision because account/app alone cannot detect changed custom artwork. Cost if wrong: avoidable artwork resolution or neutral fallback; no stored schema change.
3. The host waits for master readiness and successful menu preference loading. Failed loading remains native rather than retrying in a render loop. Cost if wrong: presentation stays unavailable until recovery/reload.
4. An explicit activation lifecycle gate handles suspension using existing UI subscriptions. Cost if wrong: delayed restyling or unnecessary teardown; no additional polling.
5. Physical controller/touch comfort, installed all-page reachability and native-popup focus return remain installation acceptance, despite successful source-level dispatcher checks. Cost if wrong: a device interaction issue may remain undetected until that pass.
6. Steam Deck hardware, on-device frost performance and installed unload/disable acceptance remain unperformed. Local lifecycle tests and native source cleanup do not substitute for those checks. Cost if wrong: hardware/performance or installed integration regressions may remain.
7. Frost uses attributable artwork and neutral fallback rather than live game-frame capture, as approved. Cost: no moving game background in Settings.
8. Unverifiable native portals retain native styling rather than guessing ownership. Cost: some dropdowns visibly keep Steam styling.

Deferred minor: the standalone preview needs an externally supplied `device-frame.png`; it is not a self-contained visual demo. Product artwork behavior is independent of that fixture asset.

The previously recorded installed radial candidate was `a60bdf6`, frontend SHA-256 `36bfb3449062cf0bb035c16c5988c85290deb12473877a5d251c4246c991add0`. This is a historical baseline, not an installed Settings digest. Before an authorized persistent installation, verify the current frontend again, save and verify a rollback copy, close the in-game menu, remove the Audio trial and reload the candidate. Then allow delayed Home remount and validate the installed lifecycle and physical controls. No backup/install is claimed by this source-only validation.


## Authorized persistent installation

Michael authorized installation with “Yes, go ahead with the installation.” Rebuilt and installed `d505b44` frontend only, with guarded replacement, independently verified digest, rollback copy and Decky reload while the side menu and keyboard were closed. That installed host correctly fell back to native: the footer glyphs were font-backed `role="img"` elements rather than SVG/img nodes, so the existing shared footer detector returned no safe groups. The earlier source validation did not expose this installed glyph variant.

A regression reproduced the null layout before accepting the verified native `role="img"` glyph structure in the existing footer detector. The corrected candidate `dcd1d18` passed 261 test files / **2,835 tests**, TypeScript, build and whitespace checks. Targeted native Settings geometry/shared footer coverage passed 20 tests. No settings schema, native setting values or controller handlers were changed.

- Installed source commit: `dcd1d18`.
- Independently verified installed frontend SHA-256: `5465f5297d1e1249dde5ab80b5bf5ef259b1a3a49ddc5ce303b84279fe52ee91`.
- Original accepted radial frontend backup: `/home/deck/gg-backup-native-settings-20261105-l8vmxfik/index.js`, independently verified SHA-256 `36bfb3449062cf0bb035c16c5988c85290deb12473877a5d251c4246c991add0`. `original.sha256` and candidate metadata are alongside it.
- Intermediate `d505b44` frontend backup: `/home/deck/gg-backup-native-settings-20261105-e6m08iej/index.js`.
- Rollback: close side menus/keyboard, restore the original accepted frontend from the first backup to `/home/deck/homebrew/plugins/game-glance/dist/index.js`, verify its hash, then reload through Decky. Preserve backend and user settings. Roll back if installed native content becomes inaccessible or cleanup strands navigation.

After the guarded corrected reload and completed Home remount, the real installed host applied artwork-backed frost at 1500×844 CSS pixels. A sequential installed pass visited all 25 categories with all 25 retained, bounded content and footer clearance. Native virtual-controller traversal reached first and last sidebar entries with the last fully visible. Last eligible controls on System, Display, Storage, Notifications, Downloads, Game Recording and Audio took native focus inside the safe area with unchanged value snapshots. The output picker opened with A, cancelled with B and returned focus without changing values; its unprovable portal deliberately retained native styling.

Route exit to Home removed every Settings marker/style/decoration; re-entry restored presentation and real artwork. Final readback: plugin loaded, temporary Audio trial removed, no side menu, no running games, `/settings/audio`. The Ally is left on Audio Settings for hands-on evaluation. Scratch audit globals were removed. No deliberate native settings writes or games were launched.

Artifacts: `settings-handheld/installed-checks.json`, `installed-finish.json`, `installed-build.json`, and `installed-ally-audio.png` in this chat's visualization directory. Programmatic native dispatcher checks do not establish physical-controller/touch comfort or performance. Installed master/menu disable, screensaver suspension and full plugin unload remain covered locally rather than claimed as exercised in this installed pass.

## Subsequent correction pass

Following user feedback, the title, category-transition stability, broader native row coverage and dropdown alignment/ownership were corrected and installed **on the Steam Deck only**. The Ally was left untouched. See [Steam Deck correction evidence](native-settings-vdl-deck-corrections.md) for source `059f70a`, all-category frame sampling, native dropdown checks and rollback metadata. Earlier popup limitations and source-only statements above describe their historical validation stages.
