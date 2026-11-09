# Social radial keyboard — design spec and controller investigation

2026-10-29. Status: written spec and Native implementation plan approved by Michael; local implementation and automated/browser checks complete. Installed on the Ally with explicit approval and a verified full restart; interactive acceptance pending. No push, PR, or release. See `docs/superpowers/reports/2026-10-29-social-radial-keyboard-local-validation.md`.

## Approved direction

An optional controller keyboard for Game Glance's Social message field, alongside the existing compact keyboard.

- Two independent wheels, one at each bottom corner of the screen. No shared keyboard panel.
- All letters visible across the two wheels. Try this first, rather than moving overflow letters to a trigger layer.
- Left stick selects on the left wheel; right stick selects on the right wheel. L3/R3 types that wheel's selection.
- Hold L2/R2 for extra characters on the corresponding wheel. Initial direction: numbers, punctuation and accents.
- Y inserts a space; B deletes.
- L1 makes letters uppercase across both wheels. Initial interpretation: hold for uppercase; release restores lowercase. This is a momentary modifier, not one-shot shift or caps lock.
- R1 cycles the selected supported Steam layouts locally within Game Glance. It does not change Steam's saved keyboard settings.
- A sends using Social's existing send eligibility; X closes the wheels and keeps the draft (approved after the controller investigation).
- Returning either stick to centre blanks that wheel's selection. Clicking a centred stick types nothing; the preceding selection is not retained for typing.
- Highlight the selected segment and enlarge its character in the wheel centre.
- The draft appears directly in the existing Social message box, which must remain readable and unobstructed. No duplicate draft display in the keyboard.
- The first trial keeps the approved mockup's arrangement: Spanish has 14 segments per wheel, including ñ and ç. Generalisation to other supported layouts follows the rule below.

Visual source: `/Users/micpaal/.codex/visualizations/2026/10/29/01a1879f-94e5-7f42-b497-62344233cc9c/radial-keyboard.html` and adjacent `radial-keyboard.png`. Background is a real Ally frame with anonymised stand-ins.

## Product behavior

### Choosing and opening the keyboard

Add a saved `Social keyboard` choice, `Compact` or `Radial`, to the existing Game Glance menu preferences UI. Default to Compact for existing and new users; malformed saved values also mean Compact. The preference selects which renderer opens from the Social compose field and does not affect other text fields.

Both renderers use the existing session and draft. Radial input is active only while a usable chat and the radial session are open. Input-method layouts retain Steam's existing field/keyboard fallback. R1 cycles only supported non-input-method layouts; with one layout it does nothing. Display the current layout's short name near the wheels' control hints, without adding another shared panel.

### Controller actions

| Input | Action while radial typing is open |
|---|---|
| Left/right stick | Select the letter on that side, independently |
| L3/R3 | Type that side's current selection once per press |
| Hold L2/R2 | Show the extra-character layer on that side; release restores letters |
| Hold L1 | Uppercase letter labels and typed letters on both sides |
| R1 press | Next supported selected layout |
| Y press | Insert a space using the existing accent-aware typing behavior |
| B press | Delete one grapheme using the existing typing reducer |
| A press | Send through Social's existing handler, only when its Send action is enabled |
| X press | Close both wheels, keep the draft, return focus to compose |

No repeat for held click/face/bumper buttons in the first trial. Releasing L1 or a trigger never types a character. Closing resets modifiers and held accents. Sending keeps the wheels available for another message, following the existing draft/send behavior.

Sticks within the centre dead zone have no selected segment. Stick clicks then do nothing. Never type the last highlighted letter after returning to centre. Use angular retention only near segment boundaries while the stick is outside the dead zone. Numerical dead-zone and retention constants are implementation tuning values, to be covered by pure tests and checked on the Ally.

Read modifiers and directions before processing click edges in each input snapshot. When the layout changes, clear both selections and pending accents, and require each stick to return to centre before it selects in the new layout. This prevents a layout change under a deflected stick from immediately typing an unexpected letter. Initialise the input baseline on opening and require buttons already held at activation to be released before they can act.

While radial input owns the controls, B must not run the shell's keyboard-cancel path and L1/R1 must not switch menu tabs. Consume direction and handled button events without suppressing Steam/Home/Quick Access globally. Pointer tab changes, Notifications, changing friend, back via UI, menu closing and chat unavailability close the session with the existing lifetime rules. Preserve first-outside-tap dismissal and physical typing. If the input feed cannot be found or throws, close radial typing without losing the draft and offer the Compact option; do not leave an invisible or unusable active keyboard.

### Letters and extra characters

The Spanish mockup's clockwise orders are `q w e r t ç g f d s a z x c` and `y u i o p ñ l k j h v b n m`, with w/u at twelve o'clock. Use that arrangement for the first Spanish trial. For other supported layouts, use Steam's compacted letter rows: split each row as evenly as possible between left and right, place the top row forward then middle row reversed then bottom row forward on each wheel. Preserve every letter exactly once; uneven halves may have different segment counts. The Spanish mapping is an explicit initial mapping rather than silently changing the approved mockup to a generic split.

Build extra-character layers from the current compact layout's existing symbols rows, including the main dead key from its letters bottom row: keep digits, punctuation, symbols and dead keys, exclude space and all non-character controls, remove duplicate equivalent definitions, then divide the ordered list into two balanced halves. All extra characters must fit in the corresponding layer; do not silently truncate to 14 segments. The extra layers may have different segment counts from letters. Accent keys retain the existing reducer's combining behavior: releasing a trigger after choosing an accent must preserve it for the next letter. Changing layouts or closing clears pending accents. Holding uppercase uses the layout's shifted character for letters where available; it does not change the extra-character layer's punctuation.

### Position, appearance and frost

Anchor the left and right wheels to their respective bottom screen corners in the native menu viewport, independently of the scaled `.gg-menu` rectangle. Keep a small safe inset for the wheel and its local hints. Match the approved real-frame mockup's proportions; handle viewport changes without off-screen controls. Do not make them draggable in this version.

Keep the centre character, selected wedge, local controller hints, and the Y/B hints legible. Show the draft only in the Social compose field; its text and Send action must remain readable. Never apply whole-column blur that obscures the compose field or conversation merely because radial typing is open.

Represent the circles as two separate optional frost regions, alongside the existing compact keyboard region. Circular masks use half-diameter corner radii; do not frost the rectangular union spanning the chat. Only the renderer currently open has nonempty keyboard regions. Reserve fixed tile capacity so opening/closing does not rebuild shaders. Extend the frontend/backend contract, Home surfaces, shader and tests consistently. Use existing frost fallbacks when unavailable. Backend device validation requires a full restart under the standing project rule; installation still requires the user's explicit approval.

### Code boundaries

- Pure radial layout construction and angle/selection logic under `src/menu/keyboard/`.
- A controller adapter that discovers the ordinary axes/button hooks by source signature, owns one consistent controller index and releases subscriptions on close.
- A separate radial component; retain the compact component and share the typing, session and layout APIs.
- Social selects the renderer from the saved preference; menu input routing recognises radial ownership.
- Frost changes extend both ends of the existing protocol and keep all existing region behavior covered.

No predictive text, cursor movement, extra global keyboard integration, haptics, or custom controller bindings in this version.

## Investigation method and limits

Read the currently loaded Steam module factory source through the existing private CEF tunnel on the Ally. Also read property names, active controller index and a numeric idle axes snapshot. No unknown Steam export was called; no test/calibration screen or controller support flow was activated. No plugin reload, installation, settings write, navigation, or input injection.

Current module IDs and minified exports below identify the inspected evidence only. Production discovery must use source/shape, consistent with the existing keyboard. Do not hard-code these IDs or names.

### Ordinary controller feed (module 35137)

The axes hook is identifiable by `useControllerAxesFeed` in its source. Its state contains:

```
nControllerIndex
LeftJoystick: { x, y }
RightJoystick: { x, y }
flLeftTrigger
flRightTrigger
```

The companion button hook contains `useControllerButtonFeed` in its source. Its state includes `bLeftStickClick`, `bRightStickClick`, `bLeftTrigger`, `bRightTrigger`, `bButtonNorth`, `bButtonEast`, `bButtonSouth`, `bButtonWest`, the bumpers, and other buttons. The underlying notifications replace the corresponding per-controller state.

Both hooks call a common React helper that starts `StartControllerStateFlow({controller_index, flow_mode})` in an effect and ends the same flow on cleanup. Axes and buttons use different flow modes. The helper also sets the store's shared controller index; avoid subscribing to different controller indices concurrently.

At inspection, Steam's active controller index was 0, there were 16 feed slots, and slot 0 exposed the expected fields. Idle stick Y was approximately -0.0000305, with X and triggers at zero. This demonstrates tiny nonzero idle values, not range, direction, or live simultaneous-input validation. The existing keyboard's `normaliseAxis` already accommodates normalised and signed-16-bit-shaped values.

### Steam's Test Device Inputs screen (module 69317)

The route is `/controller/devicesupport/:controllerIdx`. The screen starts a separate controller-device-support flow and temporarily disables Home/Quick Access buttons. Its diagram reads the support-flow state; joystick drawing divides values by 32768, flips Y, and limits vector length to one. The numeric readout uses the controller's configured/default stick dead zone.

This is useful evidence about coordinate conventions and dead-zone handling. It is not the flow to start for Social typing: the ordinary hooks already expose the inputs needed without entering a device-test workflow. Do not copy its global button-disabling or calibration behavior.

### Steam's chat radial menu (module 89166)

This is the closer production reference. It mounts the ordinary axes and button hooks together, using Steam's active controller index with a fallback of zero. It reads either joystick, computes direction with `atan2`, and suppresses directional focus navigation.

Its eight-segment selection uses a magnitude threshold of 0.75 and an angular retention margin of 0.1305 radians near adjacent segment boundaries. It also briefly retains the preceding selection for its release-to-send interaction. These constants belong to its eight-item menu; do not copy them unchanged into our 14-segment, click-to-type keyboard.

The chat radial additionally enables controller analog input messages and sets a keyboard action set. Those calls have application-level side effects. Their necessity, ownership and restoration must be investigated before using them in Game Glance; their presence in Steam's own component does not establish safe behavior in our popup. Existing left-stick drag already works through the ordinary axes hook, but simultaneous right-stick/button operation remains a device check.

## Recommended implementation approach

Reuse the existing Social draft, layout reading, typing reducer, send state and keyboard session lifetime. Add a separate radial renderer and a small controller adapter rather than adding more responsibilities to the compact keyboard component.

Mount one axes/button subscriber pair only while radial typing is active, using one consistent controller index. Treat stick clicks as rising edges so a hold inserts once. Initialise the button baseline on activation so opening with a held button cannot insert a character. Consume relevant navigation events while typing; ending the session must remove those handlers and unmount both feed hooks.

Keep angle-to-segment selection, radial dead zone and boundary retention in pure code. Read both wheels independently; Steam's chat radial chooses whichever stick has greater magnitude, which does not match this design. Avoid component-wide updates every animation frame: redraw only when a selected segment or layer changes.

Use digital trigger booleans for layer holds if they prove reliable. Analog trigger values are available if threshold hysteresis is needed, but their range and behavior must be measured rather than assumed.

Keep the existing compact keyboard available. Do not retrofit the paused compact-keyboard drag performance fix into this work unless it is necessary for shared code; the prior handoff remains intact.

## Conversation decisions

- Approved: separate bottom-corner wheels, draft only in Social, all letters visible, A send, X close, Y space, B delete, L3/R3 type, trigger-held extra layers, blank centred selection, the mockup arrangement for the first trial, L1 uppercase, R1 layout switching, and the constraint against frost covering the chat between wheels.
- Spec interpretations for review: L1 is held; keyboard mode is a saved preferences choice defaulting to Compact; non-Spanish layout splits and symbol layers use the deterministic rules above; changed layouts re-arm after centring. These fill in implementation details rather than attribute unspoken choices to the user.

## Validation needed before completion

- Both sticks and both stick clicks, trigger holds, Y/B and button edges in the actual menu popup, including simultaneous inputs.
- No focus movement or duplicate menu action while typing; input handlers stop when the keyboard closes.
- No held-button activation leak, unintended repeat, or spurious selection near centre/boundaries.
- Draft and accents update through the existing reducer; send follows the existing enabled/loading rules.
- Every chat/session exit removes the wheels and keeps the draft as appropriate.
- Both corners stay inside the actual viewport across Home/game, handheld/docked and menu scale changes, while the compose field remains readable.
- Pure behavior tests, TypeScript checks and build; Ally testing remains separate from those checks.

The source investigation supports feasibility. It does not establish live controller behavior or performance for the unimplemented radial keyboard.
