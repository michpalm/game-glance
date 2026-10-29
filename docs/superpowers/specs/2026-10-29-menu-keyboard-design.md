# Menu keyboard design

Written 2026-10-29 from the brainstorm with Michael. Status: awaiting written review. Visual reference: [Menu Keyboard](https://claude.ai/artifact/5kk1iFnARWLNAhULowfY13) (private canvas): boards A (default spot), B (dragged, accent key held), C (`?123` page) and Today (Steam's keyboard), painted on a real Ally frame. Michael approved the look ("Looks right").

## Why

Typing a message in the menu's Social chat opens Steam's docked keyboard. It takes about half the screen and covers the conversation, and in a game it sits under the menu, whose frost blurs its middle keys. Steam offers nothing smaller: its "floating" (modal) keyboard is the same full-width keyboard, only placed away from the text field (probed on the Ally, 2026-10-29: `SelectBestModalPosition` moves the keyboard element; nothing resizes it). Michael wants a compact keyboard like Gboard's floating mode.

## Scope

- One place: the Social chat's message field in the in-game menu. Every other text field keeps Steam's keyboard.
- Input: d-pad or left stick with A, and touch. No button shortcuts in this version.
- Out of scope: a text cursor (keys edit the end of the draft), emoji, suggestions, input methods (Chinese, Japanese, Korean), and any field outside Social.

## Behaviour

### Opening and closing

- Selecting the message field (A, or a tap) opens our keyboard. The field becomes a display of the draft, not a text input, so Steam's keyboard is never triggered.
- A physical keyboard types into the draft while ours is open.
- The keyboard belongs to the open chat. It closes at once when that chat stops showing: switching menu tabs (L1/R1 or a tap), opening Notifications, going back to the friends list, opening another friend, or closing the menu. The draft is kept (drafts already stay in memory per chat).
- B closes the keyboard first; the next B goes back as today (the Social spec's order: keyboard, then conversation, then menu).
- The first tap outside the keyboard closes the keyboard and does nothing else, whatever it lands on. A tap on the message field keeps it open. With the keyboard closed, taps behave as today (a tap outside the menu closes the menu).

### Keys and layouts

- Rows come from Steam's own layout data, so the keyboard follows the layouts chosen in Steam (Settings > Keyboard). On the Ally: QWERTY (layout 0) and Spanish (layout 19, current).
- Compact rows, as on the canvas: the layout's three letter rows (Spanish: `q`–`p` with digit hints, `a`–`ñ`, `⇧ z`–`m ⌫`), then `?123`, `,`, the layout's main accent key (its first dead key in reading order: Spanish `´`; a layout with none shows `'`), the space bar, `.` and `✓`. The `?123` page holds digits, common symbols, the layout's other dead keys (Spanish `¨`) and its inverted marks (`¿ ¡`); `ABC` returns.
- A digit hint types its digit when the key is held (400 ms).
- The space bar shows the selected layouts ("ES · EN"). A tap or A types a space; holding it 400 ms switches to the next layout (no effect with one layout). Chosen by Michael on 2026-10-29 from four options on the canvas (hold the space bar, a globe key, a chip on the space bar, a key on the `?123` page).
- Layouts that need an input method (Chinese, Japanese, Korean) keep Steam's keyboard for the field.

### Typing

- Keys append to the end of the draft; `⌫` removes the last character (one grapheme, so an accented letter goes at once).
- `⇧` capitalises the next letter; a double press locks caps until pressed again.
- Accent keys follow Steam's data: pressing one marks it held (accent underline, board B); the next key combines through the layout's `dead_next` / `dead_combined` strings (`´` then `a` gives `á`). A key it cannot combine with types the accent, then that key. Space after an accent types the accent alone.
- `✓` sends, exactly as the Send button: same enabled state (not loading, not sending, can chat, draft not blank) and the same `social.send()`.
- A key types on release, and only if the press is still on that key; sliding off types nothing.

### Moving

- The keyboard floats in the menu window, above the menu's panels.
- Touch: drag the full-width strip at the bottom (about 24 px tall, the grab bar plus a small move icon). Keys never start a drag. While dragging, the panel lifts (a soft shadow and a brighter edge). On release it stays where it was dropped, clamped inside the window and nudged clear of the message field if dropped over it.
- Controller: a quick press of A on the strip cycles through set spots: left of the chat (the default, board A), the right side (board B) and the top. No spot covers the message field.
- Controller drag (Michael, 2026-10-29, after the first Ally checks): while the strip has focus it shows a short label beside the move icon, "Ⓐ Hold to move" (hidden otherwise). Holding A on the strip for 400 ms lifts the panel as a touch drag does; while A stays held the left stick moves it smoothly (speed follows how far the stick is pushed, with a small dead zone) and the d-pad nudges it in small steps; the stick does not move focus meanwhile. Releasing A drops it exactly like a finger: clamped inside the window, nudged clear of the message field, remembered. The stick is read with Steam's controller axes feed (module 35137, `useControllerAxesFeed`, found by that source text; the same feed Steam's chat radial menu uses), mounted only during the drag. Without it the stick moves the panel in d-pad steps.
- While dragging (touch or controller) the panel has no frost (no shader area, no blur under it); frost returns when it is dropped (Michael, 2026-10-29, after the drag felt choppy on the Ally).
- The last position is remembered with the menu preferences and restored when the keyboard next opens.

### Look

- The menu's visual language: frost glass panel (`TOKENS.glass` with the frost recipe), 1 px edge, 16 px corners; keys in lighter glass with 10 px corners; modifier keys (`⇧ ⌫ ?123 ABC`) one step brighter; `✓` in the game's accent; the white focus ring (`focusRing('menu')`); labels with the label shadow.
- Sizes at the menu's scale: keys 34 × 40 px with 5 px gaps; the panel 409 × 210 px as on the canvas.
- In a game, the panel joins the frost areas the shader draws (as the status bar did), so it is frosted like the rest of the menu; on Home it uses the CSS frost.

## Reading Steam's layouts

- The layout list lives in Steam's keyboard module (module 40222 on Steam today): entries `{ name, layout, locToken, rgLayout }`, where `rgLayout(options)` returns rows of keys (`"q"`, `["1", "!", "|"]` for normal, shifted, AltGr, and dead keys as `{ key, label, dead: true, dead_next, dead_combined }`). Its export `r_` returns the current layout's entry. The selected layouts are in Steam's keyboard settings store (`m_userLayoutSettings`: `currentLayout`, `selectedLayouts`).
- Getting the rows means running two Steam functions: the current-layout getter and the entry's `rgLayout`. Both only assemble data (their source was read on 2026-10-29). They run once per keyboard opening, inside a guard.
- The module is found by shape (an export that is a function returning an object with `name`, `layout` and a function `rgLayout`), never by its minified names.
- The result is checked before use: rows of strings, `[normal, shifted, altGr?]` arrays or dead-key objects with matching `dead_next` / `dead_combined` lengths. Anything else, a throw, or no module: the built-in QWERTY, typed exactly as on the canvas, with `´` and `¨` as dead keys.
- All selected layouts are reachable (checked read-only on the Ally, 2026-10-29): the module exports a function whose source reads `GetKeyboardLayoutSettings()` and returns the layout list filtered to `currentLayout` / `selectedLayouts` (export `G$`, function `le`, today). It is found by that source text. It already leaves out input-method layouts unless an input method (IBus) is set up. Another export switches Steam's own layout setting (`SetKeyboardLayout`): never call it; the space bar switches only within our keyboard.

## Structure

- `src/menu/keyboard/layouts.ts`: finding Steam's layouts, validating them, compacting them into our rows and pages, and the built-in QWERTY. Pure apart from the Steam lookup, which is injected.
- `src/menu/keyboard/typing.ts`: a pure reducer for draft edits: append, backspace by grapheme, shift and caps lock, held accents and their combining.
- `src/menu/keyboard/placement.ts`: the set spots, clamping, and clearing the message field. Pure geometry.
- `src/menu/components/MenuKeyboard.tsx`: the panel, keys as menu buttons in a `Focusable` grid, the drag strip, and the outside-tap and B handling.
- `src/menu/components/SocialPanel.tsx`: the message field becomes a draft display that opens the keyboard; the keyboard mounts only while a chat is showing.

## Testing

- Layouts: a fixture shaped like Steam's data (the Spanish rows as read on 2026-10-29) compacts to the canvas's rows and pages; malformed data, a throw and a missing module each give the built-in QWERTY; input-method layouts report "use Steam's keyboard".
- Typing: append, grapheme backspace (`á`), shift once and caps lock, each accent combining, an accent with no combination, space after an accent.
- Placement: each spot stays inside the window and clear of the field; a drop over the field is nudged clear; clamping at every edge.
- Lifetime: leaving the chat by each route closes the keyboard and keeps the draft; the first outside tap and the first B only close it.
- Sending: `✓` follows the Send button's enabled state and calls the same send.
- On the Ally: type and send a Spanish message with accents by stick and by touch; drag it and cycle its spots; leave Social by each route; check the frost under it in a game.
