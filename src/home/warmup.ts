import type { HltbGame, HltbResult, PrefetchOutcome } from '../data/hltb';
import type { ProtonResult } from '../data/protondb';
import type { PlayerCount } from '../data/playerCount';

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

// ---- Description ---------------------------------------------------------------------------------------------------

/** At most this many descriptions are kept (the oldest goes first). */
export const DESCRIPTION_MEMO_MAX = 64;
const descriptionMemo = new Map<string, string>();
const descriptionKey = (appId: number, lang: string) => `${appId}:${lang}`;

/**
 * The description Home fetched for a game this session, in Steam's language `lang`, or undefined. Home fetches it for the
 * selected game so its open transition can draw it, and the game page reads it on its first render (no skeleton).
 */
export function peekDescription(appId: number, lang: string): string | undefined {
    return descriptionMemo.get(descriptionKey(appId, lang));
}

/** Remembers a description for the session; an empty one is never kept. */
export function rememberDescription(appId: number, lang: string, text: string) {
    if (!text.trim()) return;
    const key = descriptionKey(appId, lang);
    descriptionMemo.delete(key);
    descriptionMemo.set(key, text);
    while (descriptionMemo.size > DESCRIPTION_MEMO_MAX) descriptionMemo.delete(descriptionMemo.keys().next().value as string);
}

/**
 * The game page's description: the fetched one once its fetch answers (null: none), until then the one Home already
 * fetched for the game in that language, so the page's first frame has it. Undefined while unknown (the skeleton).
 */
export function knownDescription(fetched: string | null | undefined, appId: number, lang: string | undefined): string | null | undefined {
    if (fetched !== undefined) return fetched;
    return lang === undefined ? undefined : peekDescription(appId, lang);
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

// ---- ProtonDB ------------------------------------------------------------------------------------------------------

/** Pause after each ProtonDB rating fetched online: one small summary each, but asked for a whole row. */
export const PROTON_WARM_DELAY_MS = 500;

export interface ProtonWarmDeps {
    /** Whether the chip already knows the game (useProton's memo). */
    known(appId: number): boolean;
    /** The cached result (disk), or null; never goes online. */
    readCached(appId: number): Promise<ProtonResult | null>;
    /** Asks ProtonDB when nothing is cached or the answer is due, and says whether it went online. */
    prefetch(appId: number): Promise<{ status: ProtonResult['status']; fetched: boolean }>;
    /** Puts a result where the chip reads it; false when it is not one to keep (no details yet). */
    seed(appId: number, result: ProtonResult): boolean;
    /** Whether going online is allowed (the "pre-load in the background" setting). */
    allowNetwork(): boolean;
    sleep(ms: number): Promise<void>;
}

/**
 * Fills the ProtonDB chip's memo for `appIds` (Steam games, already in the order to do them), as warmHltb does: the disk
 * cache first, instantly; a game with nothing cached (or an old entry without the details) is asked online one at a
 * time when the setting allows it, pausing after each. Stops when cancelled or when ProtonDB cannot be reached.
 * The caller runs it only while ProtonDB is in a Game info slot. `onResult` is called for each game that got one.
 */
export async function warmProton(appIds: number[], deps: ProtonWarmDeps, isCancelled: () => boolean, onResult: (appId: number) => void = () => undefined): Promise<void> {
    for (const appId of appIds) {
        if (isCancelled()) return;
        if (deps.known(appId)) continue;
        const cached = await deps.readCached(appId);
        if (isCancelled()) return;
        if (cached && deps.seed(appId, cached)) {
            onResult(appId);
            continue;
        }
        if (!deps.allowNetwork()) continue;
        const outcome = await deps.prefetch(appId);
        if (outcome.status === 'unavailable') return;
        const fresh = await deps.readCached(appId);
        if (isCancelled()) return;
        if (fresh && deps.seed(appId, fresh)) onResult(appId);
        if (outcome.fetched) await deps.sleep(PROTON_WARM_DELAY_MS);
    }
}

// ---- Player counts ------------------------------------------------------------------------------------------------

/** Pause after each player count fetched online (Steam's API), as the ProtonDB warm-up does. */
export const PLAYERS_WARM_DELAY_MS = 500;

export interface PlayersWarmDeps {
    /** Whether the pill already knows the game (usePlayerCount's memo). */
    known(appId: number): boolean;
    /** The cached count (disk), or null; never goes online. */
    readCached(appId: number): Promise<PlayerCount | null>;
    /** Asks Steam when nothing is cached or the count is older than Home's age, and says whether it went online. */
    prefetch(appId: number): Promise<{ status: PlayerCount['status']; fetched: boolean }>;
    /** Puts a count where the pill reads it; false for none. */
    seed(appId: number, result: PlayerCount): boolean;
    /** Whether going online is allowed (the "pre-load in the background" setting). */
    allowNetwork(): boolean;
    sleep(ms: number): Promise<void>;
}

/**
 * Fills the player pill's memo for `appIds` (Steam games, in the order to do them), as warmProton does: the disk cache
 * first; a game with nothing cached or an old count is asked online one at a time when allowed, pausing after each.
 * Stops when cancelled or when Steam does not answer (a rate limit: the rest of the row waits for the next pass).
 */
export async function warmPlayers(appIds: number[], deps: PlayersWarmDeps, isCancelled: () => boolean, onResult: (appId: number) => void = () => undefined): Promise<void> {
    for (const appId of appIds) {
        if (isCancelled()) return;
        if (deps.known(appId)) continue;
        const cached = await deps.readCached(appId);
        if (isCancelled()) return;
        if (cached && deps.seed(appId, cached)) onResult(appId);
        if (!deps.allowNetwork()) continue;
        const outcome = await deps.prefetch(appId);
        if (outcome.status === 'unavailable') return;
        if (outcome.fetched) {
            const fresh = await deps.readCached(appId);
            if (isCancelled()) return;
            if (fresh && deps.seed(appId, fresh)) onResult(appId);
            await deps.sleep(PLAYERS_WARM_DELAY_MS);
        }
    }
}

// ---- Descriptions --------------------------------------------------------------------------------------------------

/** Pause after each description fetched online (the store), as the installed-games pre-load does. */
export const DESCRIPTION_WARM_DELAY_MS = 1000;

export interface DescriptionWarmGame {
    appId: number;
    name: string;
    isShortcut: boolean;
}

export interface DescriptionWarmDeps {
    /** A Steam game's description from the disk cache: the text, null for a cached "none", undefined when nothing is cached. */
    readCached(appId: number, lang: string): Promise<string | null | undefined>;
    /** Fetches (and caches) a game's description: the store, or for a non-Steam game Heroic's copy or the store. */
    fetch(game: DescriptionWarmGame, lang: string): Promise<string | null>;
    /** Whether going online is allowed (the "pre-load in the background" setting). */
    allowNetwork(): boolean;
    sleep(ms: number): Promise<void>;
}

/**
 * Fills the description memo for `games` (in the order to do them), so the open transition can draw a game's description
 * however soon it is opened: the disk cache first, which is instant; a game with nothing cached is fetched one at a time
 * when the setting allows it, pausing after each. `onResult` is called for each game whose description it learned.
 */
export async function warmDescriptions(
    games: DescriptionWarmGame[],
    lang: string,
    deps: DescriptionWarmDeps,
    isCancelled: () => boolean,
    onResult: (appId: number) => void = () => undefined,
): Promise<void> {
    for (const game of games) {
        if (isCancelled()) return;
        if (peekDescription(game.appId, lang) !== undefined) continue;
        if (!game.isShortcut) {
            const cached = await deps.readCached(game.appId, lang);
            if (isCancelled()) return;
            if (cached === null) continue;
            if (typeof cached === 'string') {
                rememberDescription(game.appId, lang, cached);
                if (peekDescription(game.appId, lang) !== undefined) onResult(game.appId);
                continue;
            }
        }
        if (!deps.allowNetwork()) continue;
        const text = await deps.fetch(game, lang);
        if (isCancelled()) return;
        if (text) {
            rememberDescription(game.appId, lang, text);
            onResult(game.appId);
        }
        await deps.sleep(DESCRIPTION_WARM_DELAY_MS);
    }
}

// ---- Hero art ------------------------------------------------------------------------------------------------------

/** Pause between two games' hero art (each a large image to load and decode), so they never arrive in a burst. */
export const ART_WARM_GAP_MS = 250;

export interface ArtWarmDeps {
    /** Whether the game's art is already resolved this session. */
    has(appId: number): boolean;
    /** Resolves (loads and decodes) the game's art; never rejects. */
    resolve(appId: number): Promise<unknown>;
    sleep(ms: number): Promise<void>;
}

/**
 * Resolves the hero art of every game in `ids` (in the order to do them), one at a time, so whichever is selected next, and
 * opened, already has its art: Home shows it at once and the open transition morphs over it (only the games either side of
 * the selection were ready before).
 */
export async function warmArt(ids: number[], deps: ArtWarmDeps, isCancelled: () => boolean): Promise<void> {
    for (const id of ids) {
        if (isCancelled()) return;
        if (deps.has(id)) continue;
        await deps.resolve(id);
        if (isCancelled()) return;
        await deps.sleep(ART_WARM_GAP_MS);
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
    descriptionMemo.clear();
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
