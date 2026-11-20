import { attempt } from './attempt';
import { Cache, cache as defaultCache } from './cache';
import { lookupHltb, PrefetchOutcome } from './hltb';
import type { InstalledGame } from './installedGames';
import { getShortcutDescription, shortcutDescriptionCached } from './shortcutDescription';
import { getDescription } from './steam';
import { protonGames } from './protonGame';
import { settings } from './settings';
import { usesStat } from '../logic/infoSlots';

export interface PrefetchGameDeps {
    hltb(game: InstalledGame): Promise<PrefetchOutcome>;
    cache: Cache;
    steamDescription(appId: number, lang: string): Promise<string | null>;
    shortcutDescription(game: InstalledGame, lang: string): Promise<string | null>;
    /** Whether a (non-Heroic) shortcut's description would come from the cache, without going online. */
    shortcutCached(game: InstalledGame, lang: string): Promise<boolean>;
    /** Caches the game's ProtonDB rating when due (a shortcut's by its Steam match); null when ProtonDB is in no Game info slot. */
    proton: ((game: InstalledGame) => Promise<{ fetched: boolean }>) | null;
}

const defaultDeps: PrefetchGameDeps = {
    hltb: (game) => lookupHltb.prefetch(game),
    cache: defaultCache,
    steamDescription: (appId, lang) => getDescription(appId, lang),
    shortcutDescription: (game, lang) => getShortcutDescription(game, lang),
    shortcutCached: (game, lang) => shortcutDescriptionCached(game, lang),
    get proton() {
        // Read at each game: the slots can change during a run. Only while ProtonDB is in a slot (it sends the app id).
        return usesStat(settings.get().infoSlots, 'protondb') ? (game: InstalledGame) => protonGames.prefetch(game) : null;
    },
};

/**
 * Pre-loads what the game page fetches: HowLongToBeat times, then the description (cached the same way the
 * page caches it), then the game's ProtonDB rating when ProtonDB is in a Game info slot. `fetched` says whether
 * anything went over the network, so "fetch all" knows when to pause.
 */
export async function prefetchGameData(game: InstalledGame, lang: string, deps: PrefetchGameDeps = defaultDeps): Promise<PrefetchOutcome> {
    const times = await deps.hltb(game);
    if (times.status === 'unavailable') return times; // offline: the description would fail too
    let descriptionFetched = false;
    if (!game.isShortcut) {
        const cached = await attempt('cache read', () => deps.cache.get(`desc:${game.appId}:${lang}`), null);
        if (!cached) {
            descriptionFetched = true;
            await attempt('description', () => deps.steamDescription(game.appId, lang), null);
        }
    } else {
        // Heroic descriptions are read from disk; others search Steam, unless that is cached (#48: every Unifideck game
        // counted as fetched, and the pause after each made a cached run over 500 of them take 8 minutes).
        descriptionFetched = game.heroic === null && !(await attempt('cache read', () => deps.shortcutCached(game, lang), false));
        await attempt('description', () => deps.shortcutDescription(game, lang), null);
    }
    let protonFetched = false;
    const proton = deps.proton;
    if (proton) {
        protonFetched = (await attempt('ProtonDB', () => proton(game), { fetched: false })).fetched;
    }
    return { status: times.status, fetched: times.fetched || descriptionFetched || protonFetched };
}
