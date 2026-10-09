/**
 * Words the theme draws, in Steam's own language: each phrase names the Steam localization token that says it in the
 * Steam UI (probed on the Ally, Spanish, 2026-10-07: the same words Steam's own Home and game pages show) and our English
 * for it. Steam's table is `LocalizationManager` (SharedJSContext): `LocalizeString('#Token')` returns the active
 * language's text with `%1$s` placeholders still in it, or undefined for an unknown token.
 *
 * The wording follows Steam's as closely as possible, in every language, English included ("Play Time", "Last Played"): Steam's
 * text when the token exists, else our English. Each token is the one Steam itself uses in the same place (stock Home and game
 * page). Phrases with no Steam token are not here.
 */
export interface Phrase {
    /** Steam's token, without the leading "#". */
    token: string;
    /** Our English, with `%1$s` / `%2$s` where a value goes (the same markers Steam's templates use). */
    en: string;
}

const p = (token: string, en: string): Phrase => ({ token, en });

export const PHRASES = {
    played: p('AppDetails_SectionTitle_PlayTime', 'Played'),
    lastPlayed: p('AppDetails_SectionTitle_LastPlayed', 'Last played'),
    achievements: p('AppDetails_SectionTitle_Achievements', 'Achievements'),
    added: p('Sale_AddedToLibrary', 'Added to library'),
    today: p('Time_Today', 'Today'),
    yesterday: p('Time_Yesterday', 'Yesterday'),
    todayAt: p('Time_Today_At', 'Today at %1$s'),
    dayAgo: p('TimeSince_1Day', '1 day ago'),
    daysAgo: p('TimeSince_XDays', '%1$s days ago'),
    newMark: p('AppBox_NewToLibrary_Short', 'NEW'),
    newToLibrary: p('AppBox_NewToLibrary', 'New to library'),
    updated: p('LibraryHome_RecentlyCompleted_DownloadDate', 'Updated %1$s'),
    controllerSettings: p('AppOverlay_ControllerSettings', 'Controller settings'),
    manage: p('GameAction_Manage', 'Manage'),
    gameDetails: p('AppDetails_GameInfo', 'Game details'),
    viewLibrary: p('GamepadHome_GoToLibrary', 'View more in your Library'),
    recentGames: p('LibraryHome_RecentGames', 'Recent games'),
    noPlayTime: p('AppBox_NoPlayTimeYet', 'No playtime yet'),
    tabWhatsNew: p('HomeTab_WhatsNew', "What's new"),
    tabFriends: p('tab_friends', 'Friends'),
    tabRecommended: p('HomeTab_Recommended', 'Recommended'),
    trending: p('TrendingWithFriends_Title', 'Trending among friends'),
    recentlyUpdated: p('LibraryHome_RecentlyCompleted', 'Recently updated'),
    playNext: p('LibraryHome_PlayNext', 'Play next'),
    notStarted: p('FilterElement_Unplayed', 'Not started'),
    majorUpdate: p('PartnerEvent_14', 'Major update'),
    regularUpdate: p('PartnerEvent_13', 'Regular update'),
    news: p('StartPage_News', 'News'),
    library: p('StartPage_Library', 'Library'),
    myGames: p('GameList_View_MyOwnGames', 'My games'),
    noUpdates: p('EventCalendar_NoPastUpdates', 'No updates found'),
    noMatches: p('EventCalendar_GameSearch_NoneFound', 'No matches found'),
    unavailable: p('DisplayStatus_Unavailable', 'Unavailable'),
    noResults: p('AddonPicker_NoResults', 'No results'),
    connected: p('Login_Welcome_Connected', 'Connected'),
    games: p('AppType_1', 'Games'),
    charging: p('QuickAccess_Tab_Perf_BatteryCharging', 'Charging'),
    battery: p('Header_BatteryPercentage', 'Battery %1$s%'),
    invisible: p('PersonaStateInvisible', 'Invisible'),
    lastPlayedGame: p('EventCalender_LastPlayed', 'Last played %1$s'),
    playingGame: p('Notification_FriendInGame_Body_Short', 'Playing %1$s'),
    inLibrary: p('Sale_InLibrary', 'In library'),
    freeToPlay: p('EventDisplay_CallToAction_FreeToPlay', 'Free to play'),
    onWishlist: p('EventDisplay_OnWishlist', 'On your wishlist'),
    deckVerified: p('HardwareVariant_SteamDeck_Verified', 'Deck verified'),
    wishlistSale: p('SteamNotifications_Wishlist', 'On sale from your wishlist'),
    steamCloud: p('FilterElement_SteamCloud', 'Steam Cloud'),
    cloudSaves: p('AppDetails_Feature_SteamCloud', 'Cloud saves'),
    cloudSyncing: p('LaunchApp_Action_SynchronizingCloud', 'Cloud saves: syncing'),
    cloudSynced: p('AppDetails_CloudStatus_Synchronized', 'synced'),
    cloudChecking: p('AppDetails_CloudStatus_Checking', 'checking'),
    cloudUploading: p('AppDetails_CloudStatus_Uploading', 'uploading'),
    cloudUploadingPct: p('AppDetails_CloudStatus_UploadingPercent', 'uploading %1$s%'),
    cloudDownloading: p('AppDetails_CloudStatus_Downloading', 'downloading'),
    cloudDownloadingPct: p('AppDetails_CloudStatus_DownloadingPercent', 'downloading %1$s%'),
    cloudOutOfSync: p('AppDetails_CloudStatus_OutOfSync', 'out of sync'),
    cloudPendingElsewhere: p('AppDetails_CloudStatus_PendingElsewhere', 'out of sync on another device'),
    cloudSyncFailed: p('AppDetails_CloudStatus_SyncFailed', 'unable to sync'),
    cloudConflict: p('AppDetails_CloudStatus_Conflict', 'file conflict'),
    cloudUnknown: p('AppDetails_CloudStatus_Unknown', 'unknown'),
    cloudOffline: p('PersonaStateOfflineMode', 'offline'),
    joinGame: p('Friend_Menu_JoinFriendGame', 'Join game'),
    join: p('User_WantsToPlay', 'Join'),
    cancel: p('Button_Cancel', 'Cancel'),
    inGame: p('PersonaStateInGame', 'In game'),
    online: p('PersonaStateOnline', 'Online'),
    away: p('PersonaStateAway', 'Away'),
    offline: p('PersonaStateOffline', 'Offline'),
    install: p('GameAction_Install', 'Install'),
    play: p('GameAction_Play', 'Play'),
    resume: p('GameAction_Resume', 'Resume'),
    pause: p('GameAction_Pause', 'Pause'),
    update: p('Button_Update', 'Update'),
    download: p('GameAction_Download', 'Download'),
    installed: p('LibraryTab_Installed', 'Installed'),
    favorites: p('LibraryTab_Favorites', 'Favorites'),
    // The Games row picker (Quick Access): Steam's own names for its installed collection and its library sorts.
    localGames: p('GameList_View_LocalGames', 'Locally Installed Games'),
    sortLastPlayed: p('Library_SortByLastPlayed', 'Last Played'),
    sortName: p('Library_SortByAlphabetical', 'Alphabetical'),
    sortAdded: p('Library_SortByAddedToLibrary', 'Date Added to Library'),
    sortBy: p('AppProperties_Workshop_SortBy_Label', 'Sort By:'),
    storage: p('Settings_Page_Storage', 'Storage'),
    wired: p('VRLinkType_WiredToRouter', 'Wired connection'),
} as const;

export type PhraseKey = keyof typeof PHRASES;

const PILL_WORDS: Record<string, PhraseKey> = { Play: 'play', Install: 'install', Resume: 'resume', Pause: 'pause', Download: 'download', Update: 'update' };

/** A play-pill word kept in English as a logic key ("Pause", "Download", ...), shown in Steam's language; anything else as it is. */
export function pillWord(word: string): string {
    const key = PILL_WORDS[word];
    return key ? tr(key) : word;
}

interface LocalizationLike {
    LocalizeString?(token: string): unknown;
}

/** Steam's text for a token in the active language, or undefined (no table, an unknown token, or any failure). */
export function steamToken(token: string, manager: LocalizationLike | undefined = (globalThis as { LocalizationManager?: LocalizationLike }).LocalizationManager): string | undefined {
    try {
        if (!manager?.LocalizeString) return undefined;
        const text = manager.LocalizeString(`#${token}`);
        return typeof text === 'string' && text !== '' ? text : undefined;
    } catch {
        return undefined;
    }
}

/** Fills `%1$s`, `%2$s`... with the values; null when the template wants a value that was not given. */
export function fillTemplate(template: string, values: Array<string | number>): string | null {
    let missing = false;
    const out = template.replace(/%(\d+)\$s/g, (_m, n: string) => {
        const v = values[Number(n) - 1];
        if (v === undefined) {
            missing = true;
            return '';
        }
        return String(v);
    });
    return missing ? null : out;
}

/**
 * The phrase in Steam's language, with values filled in. A missing token, or a template that cannot be filled, gives our English (filled the same way), so the UI never shows a raw token or a broken sentence.
 */
export function tr(key: PhraseKey, values: Array<string | number> = [], manager?: LocalizationLike): string {
    const phrase = PHRASES[key];
    const steam = steamToken(phrase.token, manager ?? (globalThis as { LocalizationManager?: LocalizationLike }).LocalizationManager);
    const filled = steam === undefined ? null : fillTemplate(steam, values);
    return filled ?? fillTemplate(phrase.en, values) ?? phrase.en;
}
