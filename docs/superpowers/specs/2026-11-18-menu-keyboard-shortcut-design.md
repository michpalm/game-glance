# X in the Game Glance menu opens Steam's keyboard — short design (2026-11-18)

## Why

Steam + X opens Steam's on-screen keyboard only where Steam Input applies its button chords. With Michael's 8BitDo
Ultimate 2C (an Xbox-type controller) in World of Warcraft through NonSteamLaunchers it does nothing, with or without
the Game Glance menu (checked on the PS5). He needed to type in game and had no way to bring the keyboard up.

## What

- **X while the Game Glance menu is open** opens Steam's keyboard, as Steam + X would: Steam closes its side menus
  (ours with them) and, over a game, shows its keyboard screen that types into the game; elsewhere, the keyboard for the
  focused text field. A second request while it shows hides it (Steam's own toggle).
- **Steam, then X**: the Game Glance menu opens on the Steam button, so the steps are close to the chord, and work with
  any controller, Steam Input or not.
- Not while Game Glance's own keyboard is up (X is backspace there).

## How

Steam's handler for Steam + X is `SteamUIStore.OnModalKeyboardMessage(message)` (registered with
`SteamClient.Input.RegisterForUserKeyboardMessages`; read on the PS5, 2026-11-18). The menu calls it with the message a
chord sends: `{ nAppID: <running app or 0>, bChordInvoked: true, bEnterDismissesKeyboard: true, nXPosition: 0,
nYPosition: 0, nWidth: 0, nHeight: 0 }`. Missing handler (another Steam build): X does nothing, as before.

## Builder's calls

- The X hint ("Keyboard") in Steam's footer while the menu is open.

## Non-goals

A keyboard chord of our own outside the menu; changing Steam Input settings.
