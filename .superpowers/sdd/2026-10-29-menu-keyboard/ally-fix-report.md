# Menu keyboard ally fix round

Each change: failing test first (npx vitest run tests/menu/styles.test.ts tests/menu/keyboard/layouts.test.ts tests/menu/menuKeyboard.test.ts), then fix.

1. Keyboard background rgba(12,16,22,.88) (src/menu/socialStyles.ts; unused TOKENS import removed). Test: styles.test.ts glass-panel test. RED: failed, GREEN: passes.
2. Space-bar label lists current layout first (src/menu/keyboard/layouts.ts). Test: layouts.test.ts, selected [0,19], current 19 -> "ES · EN". RED: failed, GREEN: passes.
3. Keys grid + strip wrapped in one Focusable flow-children="column" (MenuKeyboard.tsx). Test: menuKeyboard.test.ts, shared Focusable parent, grid first, strip second. RED: failed, GREEN: passes.
4. Rows get navEntryPreferPosition MAINTAIN_X (2, type-cast constant as in FeedSheet; no mock change needed). Test: all 4 rows carry 2. RED: failed (1 failed, 20 passed), GREEN: passes.

Initial RED run (changes 1-3): 3 failed, 62 passed. Final: focused 66 passed; tsc --noEmit clean; full vitest 192 files / 2201 tests passed; npm run build ok.
