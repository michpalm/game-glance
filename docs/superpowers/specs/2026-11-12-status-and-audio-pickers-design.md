# Online status and audio device pickers — design

Date: 2026-11-12. Status: written, awaiting Michael's review.
Mock-ups (Michael's Bazzite folder), painted on the real Ally menu: `audio-device-options.png` (option B chosen),
`status-picker-options.png` (option A chosen).

## Goal

Two small additions to Game Glance's menu, both a pill that opens a short list:

1. **Social:** your own online status (Online, Away, Invisible, Offline), beside the Social heading.
2. **Quick settings:** which device plays sound (Output) and which records it (Input), under the Volume and
   Microphone sliders.

## Decisions (Michael, 2026-11-12)

| Question | Answer |
|---|---|
| Status placement | A: a pill right after the "Social" heading; "2 online" stays at the right. |
| Status choices | Steam's own four: Online, Away, Invisible, Offline. |
| Audio placement | B: an Output pill under Volume and an Input pill under Microphone, one per column. |
| Only one device | The pills always show (which device is in use); the list then holds Automatic and that device. |

## Feasibility (read-only checks on the Ally, 2026-11-12)

**Status.** Steam's friends store (`g_FriendsUIApp.FriendStore`, where Game Glance already reads and sets Do not disturb)
has `SetUserPersonaState(state)` and the current value in `m_eUserPersonaState` (Michael: 7, Invisible). Values (Steam's
EPersonaState): Offline 0, Online 1, Away 3, Invisible 7. Changes arrive through
`AddPersonaStateChangedCallback`; otherwise the menu re-reads on open.

**Audio.** Game Glance already reads `SteamClient.System.Audio.GetDevices()` for the sliders. It also returns
`overrideOutputDeviceId` / `overrideInputDeviceId` (-1: none) and each device's `sName`, `bHasOutput`, `bHasInput`.
Choosing is `SetDefaultDeviceOverride(deviceId, type)`; Automatic is `ClearDefaultDeviceOverride(type)` (type 1 output,
0 input, as the sliders use). Both are in Decky's typed `Audio` API, and are what Steam's own Sound settings call. The
Ally today: "Ryzen HD Audio Controller" (speakers and mic); the Radeon HDMI controller has no output until a display
is connected. Device lists already refresh on add and remove (`nativeCore.ts` scan).

## Status pill (Social)

- **Place:** inside `.gg-menu-heading`, right after `<h2>Social</h2>`; the online count keeps the right edge.
- **Look:** the menu's glass pill (as the store pill: edge, glass, 12-on-32 corner), a status dot and the state's name,
  a chevron. Dots: Online `#57cbde` (Steam's online blue), Away `#7f8a96`, Invisible a hollow grey ring, Offline
  `#3d4450`.
- **List (mock-up "A, open"):** opens under the pill: Online; Away; Invisible ("Appear offline, still chat");
  Offline ("Sign out of Friends"). The current one is selected with a tick. A picks; B closes and returns focus to the pill.
- **Focus:** one stop; Up from the friends list and from the chat header reach it.
- **Unavailable:** without the friends store or `SetUserPersonaState` (or Friends not connected, as Do not disturb
  checks), no pill.
- **Writes:** `SetUserPersonaState(value)` only, with one of the four values above; never other functions.

## Audio pills (Quick settings)

- **Place:** a row right under the Volume and Microphone sliders, Output in Volume's column, Input in Microphone's.
  Down from a slider lands on its own pill (the panel's existing grid).
- **Look:** full-width glass pill: a dim label ("Output" / "Input"), the device name, a chevron.
- **Name shown:** with an override, that device's `sName`; without one, "Automatic · " and the active device's name.
- **List (mock-up "B, open"):** Automatic ("Follows the connected device"), then every device with output (Output) or
  input (Input), by `sName` only (Steam's list gives no kind, so no second line as in the mock-up). The chosen entry is ticked (Automatic
  when no override). A picks, B closes; focus returns to the pill.
- **Writes:** a device → `SetDefaultDeviceOverride(id, type)`; Automatic → `ClearDefaultDeviceOverride(type)`. The
  sliders then follow the new active device (they already key on it).
- **Unavailable:** without `GetDevices` or the override functions, no row.

## Shared list component

Both use one menu dropdown: a pill (button) that opens a glass list anchored under it, inside the menu panel so it
takes the menu's scale; D-pad Up/Down through the entries, A to pick, B to close. Long names truncate with an ellipsis
in the pill and wrap in the list.

## Testing

- Bridge tests for each: reads (current status; devices, override, active), writes call exactly the named function
  with the right arguments, and missing functions mean no control.
- Pill label: status names; "Automatic · Ryzen HD Audio Controller" without an override; the device name with one.
- List: entries and ticks for each case (one device, several, override set or not).
- On the Ally: change status and see it in Steam's friends list; with Bluetooth headphones connected, switch output
  and back to Automatic; the sliders follow the chosen device.

## Out of scope

- Do not disturb (already a Quick settings toggle) and Steam's other persona states (Busy, Snooze, Looking to...).
- Per-app audio routing; renaming devices.
