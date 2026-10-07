import type { HltbGame, HltbResult, PrefetchOutcome } from '../data/hltb';

/**
 * Background warm-up for Home, so a game's HowLongToBeat chip and Achievements chip are already known when it is selected
 * instead of being fetched then. Pure: Steam, the plugin cache and the clock come in as `deps`, so the loops are testable.
 */

/** The items nearest `centre` first (a tie goes to the right: the way L1/R1 and Right move), each at most once. */
export function warmOrder<T>(items: T[], centre: number): T[] {
    const at = Math.min(Math.max(0, Math.floor(centre) || 0), Math.max(0, items.length - 1));
    return items
        .map((item, index) => ({ item, index, distance: Math.abs(index - at) }))
        .sort((a, b) => a.distance - b.distance || b.index - a.index)
        .map((entry) => entry.item);
}

// ---- HowLongToBeat -------------------------------------------------------------------------------------------------

const hltbMemo = new Map<number, HltbResult>();

/** The result Home already knows for a game (this session: from the warm-up or an earlier selection), or undefined. */
export function peekHltb(appId: number): HltbResult | undefined {
    return hltbMemo.get(appId);
}

/** Remembers a result for the session; "unavailable" (offline) is never kept. */
export function rememberHltb(appId: number, result: HltbResult) {
    if (result.status === 'unavailable') return;
    hltbMemo.set(appId, result);
}

export function forgetHltb(appId?: number) {
    if (appId === undefined) hltbMemo.clear();
    else hltbMemo.delete(appId);
}

/** Pause after each lookup that went online, to stay gentle on HowLongToBeat (the same pace as the installed-games pre-load). */
export const HLTB_WARM_DELAY_MS = 1500;

export interface HltbWarmDeps {
    /** The cached result (disk), or null; never goes online. */
    readCached(game: HltbGame): Promise<HltbResult | null>;
    /** Fetches and caches a game's times when the cache has none or they are stale, then says what it found. */
    prefetch(game: HltbGame): Promise<PrefetchOutcome>;
    /** Whether going online is allowed (the "pre-load in the background" setting). */
    allowNetwork(): boolean;
    sleep(ms: number): Promise<void>;
}

/**
 * Fills the HowLongToBeat memo for `games` (already in the order to do them): the disk cache first, which is instant; a game
 * with nothing cached is looked up online one at a time when the setting allows it, pausing after each. Stops when
 * cancelled, or when HowLongToBeat cannot be reached. `onResult` is called for each game that got a result.
 */
export async function warmHltb(games: HltbGame[], deps: HltbWarmDeps, isCancelled: () => boolean, onResult: (appId: number) => void = () => undefined): Promise<void> {
    for (const game of games) {
        if (isCancelled()) return;
        if (hltbMemo.has(game.appId)) continue;
        let result = await deps.readCached(game);
        if (isCancelled()) return;
        if (!result) {
            if (!deps.allowNetwork()) continue;
            const outcome = await deps.prefetch(game);
            if (outcome.status === 'unavailable') return;
            result = await deps.readCached(game);
            if (isCancelled()) return;
            if (outcome.fetched) await deps.sleep(HLTB_WARM_DELAY_MS);
        }
        if (result && result.status !== 'unavailable') {
            rememberHltb(game.appId, result);
            onResult(game.appId);
        }
    }
}

// ---- Achievements --------------------------------------------------------------------------------------------------

/** How long to wait for Steam's details of one game before moving on (it answers in about 0.4 s when it has them). */
export const DETAILS_WAIT_MS = 1500;
/** Pause between two games, so the requests do not arrive in a burst. */
export const DETAILS_GAP_MS = 120;

const detailsTried = new Set<number>();

export function resetWarmup() {
    hltbMemo.clear();
    detailsTried.clear();
}

export interface DetailsWarmDeps {
    /** Whether the achievement counts for the game are already known. */
    has(appId: number): boolean;
    /** Asks Steam for the game's details; `onDetails` is called with each answer. Returns something to cancel it with. */
    register(appId: number, onDetails: (details: unknown) => void): { unregister(): void } | undefined;
    sleep(ms: number): Promise<void>;
}

/**
 * Asks Steam for the details (achievement counts) of each game in turn, `waitMs` at most per game, stopping early once
 * the counts are known. Each game is tried once per session, so a game with no achievements is not asked for again on every
 * Home visit. `onDetails` receives every answer (Home keeps them in its details memo).
 */
export async function warmAchievements(
    ids: number[],
    deps: DetailsWarmDeps,
    isCancelled: () => boolean,
    onDetails: (appId: number, details: unknown) => void,
    waitMs: number = DETAILS_WAIT_MS,
): Promise<void> {
    for (const id of ids) {
        if (isCancelled()) return;
        if (deps.has(id) || detailsTried.has(id)) continue;
        detailsTried.add(id);
        let registration: { unregister(): void } | undefined;
        await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, waitMs);
            const finish = () => {
                clearTimeout(timer);
                resolve();
            };
            try {
                registration = deps.register(id, (details) => {
                    onDetails(id, details);
                    if (deps.has(id)) finish();
                });
            } catch {
                finish();
            }
        });
        try {
            registration?.unregister();
        } catch {
            // already gone
        }
        await deps.sleep(DETAILS_GAP_MS);
    }
}
