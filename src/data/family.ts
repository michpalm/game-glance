import { tr } from '../i18n/steamText';

/**
 * Games from the user's Steam Families library (borrowed, not owned). Steam marks them in the app overview with
 * `owner_account_id`, the 32-bit account id of the family member who owns the game (probed on the Ally: Death's Door,
 * owned by a friend; the user's own games have none). Steam's game page says so in a line under Play, which the
 * restyled page has no room for; Game Glance shows it as a pill beside the store pill instead, on Home and the game
 * page, with the owner's name when they are on the friends list.
 */

/** Steam's 64-bit id of account 0 (individual accounts): a 64-bit id minus this is the 32-bit account id. */
const STEAM_ID64_BASE = 76561197960265728n;

/** The 32-bit account id for a 64-bit Steam id string; null when it is not one. */
export function accountIdOf(steamId64: unknown): number | null {
    if (typeof steamId64 !== 'string' || !/^\d{17}$/.test(steamId64)) return null;
    const id = BigInt(steamId64) - STEAM_ID64_BASE;
    return id > 0n && id < 0x100000000n ? Number(id) : null;
}

/** The account that owns a borrowed game, from its overview; null for the user's own games (or the user's own id). Pure. */
export function familyOwnerId(overview: unknown, selfAccountId: number | null): number | null {
    const owner = Number((overview as { owner_account_id?: unknown } | null | undefined)?.owner_account_id);
    if (!Number.isInteger(owner) || owner <= 0 || owner === selfAccountId) return null;
    return owner;
}

/** The owner's name from the friends list (`friendStore.allFriends`), null when they are not on it. Pure. */
export function familyOwnerName(accountId: number, friends: unknown): string | null {
    if (!Array.isArray(friends)) return null;
    const friend = (friends as Array<{ m_unAccountID?: unknown; display_name?: unknown } | null>).find((f) => Number(f?.m_unAccountID) === accountId);
    const name = friend?.display_name;
    return typeof name === 'string' && name.trim() !== '' ? name.trim() : null;
}

/** "Family Sharing · Grave" in Steam's words (its Family Sharing feature name), the name left out when unknown. */
export function familyLabel(ownerName: string | null): string {
    return ownerName ? `${tr('familySharing')} · ${ownerName}` : tr('familySharing');
}

interface Globals {
    appStore?: { GetAppOverviewByAppID?(appId: number): unknown };
    friendStore?: { allFriends?: unknown };
    App?: { m_CurrentUser?: { strSteamID?: unknown } };
}

/** The family pill's text for a game, or null when the game is the user's own. Never throws. */
export function familyPillLabel(appId: number): string | null {
    try {
        const g = globalThis as unknown as Globals;
        const owner = familyOwnerId(g.appStore?.GetAppOverviewByAppID?.(appId), accountIdOf(g.App?.m_CurrentUser?.strSteamID));
        return owner === null ? null : familyLabel(familyOwnerName(owner, g.friendStore?.allFriends));
    } catch {
        return null;
    }
}
