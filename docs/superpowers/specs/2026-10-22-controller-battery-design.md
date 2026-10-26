# Controller battery in the status bar — design

2026-10-22. Status: approved 2026-10-22. Evidence: `docs/validation/3.5.0-controller-battery.md`.

## Problem

A Bluetooth controller's charge is invisible in Spotlight Home's status bar. Steam's own top bar shows a controller icon, but its level comes from `ControllerStore.ucBatteryLevel`, which stays at 100 for the 8BitDo Ultimate 2C (BlueZ and Steam's Bluetooth settings both report 17–18%). Game Glance must not repeat that mistake.

## Source: BlueZ, read by the backend

The Steam frontend has no Bluetooth API, so the Python backend reads BlueZ:

- New callable `get_controller_batteries()` in `main.py`, backed by a pure module `py_modules/gameglance/bluetooth.py`.
- It runs `busctl --system --json=short call org.bluez / org.freedesktop.DBus.ObjectManager GetManagedObjects` (2 s timeout, no new Python dependency). Verified on the Ally as the `deck` user; no root needed.
- The parser keeps devices whose `org.bluez.Device1` has `Connected = true` and `Icon` starting with `input-gaming`, and that expose `org.bluez.Battery1.Percentage`. It returns `[{ name, percent }]`; the frontend sorts (lowest percent, then name).
- Addresses never leave the backend: no MAC, object path or serial in the result or the logs.
- Any failure (no BlueZ, no `busctl`, timeout, bad JSON) returns `[]`.

## Shared store

`home/statusStore.ts` gains `controllers: ControllerBatteryView[]` next to `battery` and `connection`, so Home, the game page and the screensaver share one reader.

- Read once when the first status bar mounts, then every 60 s while any status bar is mounted; stop when none is. Battery moves slowly (18 → 17 in about an hour of observation), so 60 s is ample.
- Equality check before notifying, as for the system battery.
- `ControllerBatteryView = { name, percent, low }`, with `low` at or below `LOW_BATTERY` (20%), the same threshold and "bad" colour as the system battery.

## Which controllers show

- Connected Bluetooth gamepads that report a battery: yes.
- The built-in controller: no (no battery of its own; Steam's 100 is a placeholder).
- USB-wired controllers: no (BlueZ does not see them, and Steam's level is unreliable).
- Bluetooth mice, keyboards and headsets: no (`Icon` is not `input-gaming`).
- No reading: nothing shown. Never a placeholder percentage.
- Charging: not shown. BlueZ's Battery1 has no charging state.

## Layout

In the status pill, before the system battery: a gamepad glyph with the percent, in the pill's text style. At or below 20% the item takes the "bad" colour, like the system battery.

- One controller: one item.
- Two or more: one item per controller, lowest first, at most two, then `+n` for the rest (approved 2026-10-22 with the mockup).
- Accessible label: the name, then Steam's own battery string, e.g. "8BitDo Ultimate 2C Wireless, Battery 17%".
- Handheld and docked widths use the existing `statusScale`; the pill grows leftward.

## Setting

Shown by default whenever the status bar is on. No separate toggle unless review asks for one.

## Tests

- Python: the parser on a sanitized `GetManagedObjects` fixture (controller with battery, disconnected controller, mouse with battery, controller without Battery1, malformed JSON) and on a `busctl` failure.
- Frontend: store polling start/stop with mount count, equality-gated notifications, `low` at 20 and 21, ordering and the two-item cap with `+n`.

## Not in scope

Charging state, USB controllers, Steam's own top bar, and per-controller colours.
