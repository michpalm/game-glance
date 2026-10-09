# Localization

The theme draws its own words, so they follow Steam's language through Steam's own string table.

- **How.** `src/i18n/steamText.ts` holds the phrase table: each phrase names the Steam token that says it in Steam's own UI
  and our English for it. `tr('lastPlayed')` returns Steam's text in the active language (English included, so "Play Time",
  "Last Played"), or our English when Steam has no token. `%1$s` placeholders are filled by `tr`. Steam's table is
  `window.LocalizationManager` (SharedJSContext): `LocalizeString('#Token')`.
- **Same words as Steam.** Each token is the one Steam uses in the same place on its stock Home and game page (probed on the
  Ally in Spanish, 2026-10-07), not just an English match: Played is "Tiempo de juego" (`AppDetails_SectionTitle_PlayTime`).
- **Read when drawn.** Never at module load: Steam's table may not be loaded then (tabs, news pills and the status labels are
  functions for that reason).
- **Numbers and dates** follow the Steam language through `Intl` (`logic/format.steamLanguageToLocale`).

## Unifideck's words

The size item's label on a Unifideck game's page is Unifideck's own word (it has its own 16 languages, unreachable from
outside): `data/unifideckLabel` reads the first item of its meta row, which our theme hides but leaves in the page
(`themeCss.UNIFIDECK_META`): "Installed size" / "Tamaño instalado" when installed, "Space required" / "Espacio requerido"
when not. Our English ("Installed size" / "Install size") is used until it has been read, or if its layout changes.

## Not covered yet (re-audited 2026-10-07)

### A. Wired in from Steam's tokens (done)

Friends' sub line ("Último jugado: {juego}" `EventCalender_LastPlayed`, "Jugando a {juego}" `Notification_FriendInGame_Body_Short`);
the status bar's battery label (`Header_BatteryPercentage`, "Cargando" `QuickAccess_Tab_Perf_BatteryCharging`) and dot label
(`PersonaState…`); the Library card's "Juegos" (`AppType_1`); trending tags (`Sale_InLibrary`,
`EventDisplay_CallToAction_FreeToPlay`); a wishlist deal's line (`EventDisplay_OnWishlist`, `HardwareVariant_SteamDeck_Verified`);
the Recommended row title (`SteamNotifications_Wishlist`, "Deseados en oferta"); the Steam Cloud button's words
(`FilterElement_SteamCloud` + `AppDetails_CloudStatus_*`: "Steam Cloud: Actualizado / Comprobando... / Cargando... (45 %) / No sincronizado /
No se ha podido sincronizar / Conflicto de archivos / Modo desconectado"); and the Unifideck cloud button, mapped onto the same
words with the prefix `AppDetails_Feature_SteamCloud` ("Partidas guardadas en Cloud: ..."): in sync = Actualizado, syncing =
`LaunchApp_Action_SynchronizingCloud`, a newer save or not uploaded yet = No sincronizado, save folder not found = No se ha podido
sincronizar, nothing saved yet = Desconocido (the icon and colour still tell the states apart).

Added 2026-10-09: the Games row (Quick Access → Spotlight Home): "Recent Games" (`LibraryHome_RecentGames`), Steam's own
collections named by Steam ("Favorites" `LibraryTab_Favorites`, "Locally Installed Games" `GameList_View_LocalGames`: their
stored `displayName` keeps the language Steam had when it made them; the user's own collections keep their names), the sorts
as Steam's library names them ("Last Played" `Library_SortByLastPlayed`, "Alphabetical" `Library_SortByAlphabetical`, "Date
Added to Library" `Library_SortByAddedToLibrary`), the "Sort By" label (`AppProperties_Workshop_SortBy_Label`, its colon
dropped); a collection's never-played game in the eyebrow: "No playtime yet" (`AppBox_NoPlayTimeYet`). The Game logo option
draws no words (the logo's alt text is the game's name); the tab sounds are Steam's own (`ChangeTabs`, `FailedNav`).

Added 2026-10-09 (later): Popular with friends cards from Steam's own list carry no "N friends" line, as Steam's shelf
(the avatars show who plays it; our "1 friend plays" is gone). The fallback built from friends' activity, when Steam's list
is empty, says "1 amigo jugando" / "3 amigos jugando" (`AppPortraitHover_FriendsPlaying`, `_Plural`: Steam's game cards)
or "2 amigos han jugado recientemente" (`AppDetails_FriendsPlayedRecently`, `_Plural`). A sale's price no longer says "was": the
full price is struck through after the sale price, as Steam's store shows it, so there is no word to translate.

### B. Reworded onto Steam's own words (done)

"Open Library" is now "Library" (`StartPage_Library`); the Library card's eyebrow is "My games" (`GameList_View_MyOwnGames`); the
eyebrow "Continue playing · {when}" is "Last played · {when}" (and "Recent games" with no date); the What's new empty line is "No
updates found" (`EventCalendar_NoPastUpdates`); the Friends and Recommended empty lines are "No results" (`AddonPicker_NoResults`);
the HowLongToBeat card says "HowLongToBeat" (the name) with "No matches found" (`EventCalendar_GameSearch_NoneFound`) or
"Unavailable" (`DisplayStatus_Unavailable`); the Wi-Fi label is "Connected" (`Login_Welcome_Connected`); the Join confirm shows
only "{friend} · {game}" under Steam's own "Join game" title and buttons; the empty Home shows just the Library button; the
"Short game" pill is "Play next".

### C. Still no Steam token (English until we write our own words)

- HowLongToBeat columns: "Main" (Steam's only "Main" is the OS branch, "Principal": not used), "+ Extras", "100%"; the chip "HLTB main"; "Main story complete"; the Quick Access hints ("Set the right game in Quick Access → Game Glance").
- Quick Access settings panel (a Decky panel): every label and description, including the new "Game logo" and "Games row" labels and their descriptions (no Steam token: Steam's only match is "Logo", `LibraryAssetType_Logo`). Deferred to the end, once its wording has settled; the Games row's choices and Sort By above already follow Steam.
- Plugin log lines and error text: English by design.
