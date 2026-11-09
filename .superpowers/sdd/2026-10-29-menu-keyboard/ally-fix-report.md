# Menu keyboard ally fix round

Each change: failing test first (npx vitest run tests/menu/styles.test.ts tests/menu/keyboard/layouts.test.ts tests/menu/menuKeyboard.test.ts), then fix.

CHANGE OF PLAN for fix 1: the .88 fill (commit 0fa6543) was replaced by fix 1' below (standard glass restored, TOKENS import back).

1'. Columns under the keyboard get CSS blur(16px) via class gg-keyboard-under: pure underKeyboard helper + markUnderKeyboard (placement.ts), applied in a layout effect after every placement, cleared on close/unmount; CSS with fading transition on friend list and timeline (reduced-motion rule in styles.ts already covers .gg-menu *). Tests: placement.test.ts (overlap, touching edge, none, mark + cleanup clears; RED: 3 failed, GREEN), styles.test.ts CSS rule (written after the CSS, so it never failed first). Final: 98 focused passed, tsc clean, full 192 files / 2205 tests, build ok.

(superseded) 1. Keyboard background rgba(12,16,22,.88) (src/menu/socialStyles.ts; unused TOKENS import removed). Test: styles.test.ts glass-panel test. RED: failed, GREEN: passes.
2. Space-bar label lists current layout first (src/menu/keyboard/layouts.ts). Test: layouts.test.ts, selected [0,19], current 19 -> "ES · EN". RED: failed, GREEN: passes.
3. Keys grid + strip wrapped in one Focusable flow-children="column" (MenuKeyboard.tsx). Test: menuKeyboard.test.ts, shared Focusable parent, grid first, strip second. RED: failed, GREEN: passes.
4. Rows get navEntryPreferPosition MAINTAIN_X (2, type-cast constant as in FeedSheet; no mock change needed). Test: all 4 rows carry 2. RED: failed (1 failed, 20 passed), GREEN: passes.

Initial RED run (changes 1-3): 3 failed, 62 passed. Final: focused 66 passed; tsc --noEmit clean; full vitest 192 files / 2201 tests passed; npm run build ok.
