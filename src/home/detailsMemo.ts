/**
 * Library assets Steam sent through `SteamClient.Apps.RegisterForAppDetails`, kept for the session.
 *
 * Steam's `appDetailsStore` only holds the details of games it loaded itself (the first few recents, and any game whose
 * page was opened), so for later recents the hero art's hashed file name (`strHeroImage`) was unknown and Home showed
 * the blurred capsule (Reddit: "after the first 4 titles it is a zoomed in capsule image"). The registration's callback
 * does carry the details; they are remembered here and read when the store has none (artwork.browserStores).
 */
export interface LibraryAssets {
    strHeroImage?: string;
    strHeaderImage?: string;
    strLogoImage?: string;
}

/** At most this many games are remembered; the oldest go first. */
export const DETAILS_MEMO_MAX = 64;

const memo = new Map<number, LibraryAssets>();
const rawMemo = new Map<number, unknown>();

/** Remembers `details` and `details.libraryAssets` for `appId`. Never throws. */
export function noteDetails(appId: number, details: unknown) {
    try {
        if (!Number.isInteger(appId) || appId <= 0 || !details || typeof details !== 'object') return;
        rawMemo.delete(appId);
        rawMemo.set(appId, details);
        while (rawMemo.size > DETAILS_MEMO_MAX) rawMemo.delete(rawMemo.keys().next().value as number);

        const assets = (details as { libraryAssets?: unknown })?.libraryAssets;
        if (!assets || typeof assets !== 'object') return;
        const { strHeroImage, strHeaderImage, strLogoImage } = assets as Record<string, unknown>;
        const kept: LibraryAssets = {};
        if (typeof strHeroImage === 'string') kept.strHeroImage = strHeroImage;
        if (typeof strHeaderImage === 'string') kept.strHeaderImage = strHeaderImage;
        if (typeof strLogoImage === 'string') kept.strLogoImage = strLogoImage;
        memo.delete(appId);
        memo.set(appId, kept);
        while (memo.size > DETAILS_MEMO_MAX) memo.delete(memo.keys().next().value as number);
    } catch {
        // keep what was there
    }
}

/** The remembered assets for `appId`, or undefined. */
export function memoDetails(appId: number): LibraryAssets | undefined {
    return memo.get(appId);
}

/** The remembered raw details object for `appId`, or undefined. */
export function memoRawDetails(appId: number): unknown | undefined {
    return rawMemo.get(appId);
}

/** Forgets everything (tests). */
export function resetDetailsMemo() {
    memo.clear();
    rawMemo.clear();
}

