import { toaster } from '@decky/api';
import { useSyncExternalStore } from 'react';
import { PLUGIN_NAME } from '../constants';
import { PrefetchOutcome } from './hltb';
import { InstalledGame, listInstalledGames } from './installedGames';
import { prefetchGameData } from './prefetchGame';
import { getSteamLanguage } from './steam';

export interface FetchAllState {
    running: boolean;
    done: number;
    total: number;
    found: number;
    notFound: number;
}

export interface FetchAllDeps {
    listGames(): Promise<InstalledGame[]>;
    prefetch(game: InstalledGame): Promise<PrefetchOutcome>;
    sleep(ms: number): Promise<void>;
    notify(message: string): void;
    delayMs: number; // pause after each network fetch, to stay gentle on HowLongToBeat
    /** How long one game may take before it is skipped (a request that never answers must not stop the run). */
    gameTimeoutMs?: number;
}

/**
 * One game's time limit: a HowLongToBeat lookup and a description, each normally a second or two. A request that never
 * answered (seen on the Ally: the run stuck at 0 / 55, Stop doing nothing) skips the game instead of holding the run.
 */
export const GAME_TIMEOUT_MS = 45_000;

const plural = (n: number) => (n === 1 ? 'game' : 'games');

/** Pre-loads game data (times and descriptions) for every installed game, one at a time. Survives the menu closing. */
export function createFetchAll(deps: FetchAllDeps) {
    let state: FetchAllState = { running: false, done: 0, total: 0, found: 0, notFound: 0 };
    let stopRequested = false;
    /** Wakes a run waiting on a game, so Stop takes effect at once. */
    let wakeOnStop: (() => void) | null = null;
    const listeners = new Set<() => void>();
    const set = (next: Partial<FetchAllState>) => {
        state = { ...state, ...next };
        listeners.forEach((listener) => listener());
    };

    /** `quiet`: a background run, with no notifications. */
    async function start({ quiet = false }: { quiet?: boolean } = {}): Promise<void> {
        if (state.running) return;
        const notify = (message: string) => {
            if (!quiet) deps.notify(message);
        };
        stopRequested = false;
        set({ running: true, done: 0, total: 0, found: 0, notFound: 0 });
        let games: InstalledGame[] = [];
        try {
            games = await deps.listGames();
        } catch {
            games = [];
        }
        if (games.length === 0) {
            set({ running: false });
            notify('No installed games found.');
            return;
        }
        set({ total: games.length });
        const limit = deps.gameTimeoutMs ?? GAME_TIMEOUT_MS;
        for (const game of games) {
            let outcome: PrefetchOutcome | null = null;
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                // The game's lookup, its time limit, or Stop: whichever comes first.
                outcome = await Promise.race([
                    deps.prefetch(game),
                    new Promise<null>((resolve) => {
                        timer = setTimeout(() => resolve(null), limit);
                    }),
                    new Promise<null>((resolve) => {
                        wakeOnStop = () => resolve(null);
                    }),
                ]);
            } catch {
                outcome = null; // one broken game should not stop the rest
            } finally {
                if (timer !== undefined) clearTimeout(timer);
                wakeOnStop = null;
            }
            // Stop interrupted a game still waiting: it does not count. A game that finished still does (below).
            if (stopRequested && outcome === null) break;
            if (outcome?.status === 'unavailable') {
                set({ running: false });
                notify('HowLongToBeat could not be reached. Try again later.');
                return;
            }
            set({
                done: state.done + 1,
                found: state.found + (outcome?.status === 'found' ? 1 : 0),
                notFound: state.notFound + (outcome?.status === 'notFound' ? 1 : 0),
            });
            if (stopRequested) break;
            if (outcome?.fetched && state.done < games.length) await deps.sleep(deps.delayMs);
            if (stopRequested) break;
        }
        set({ running: false });
        notify(
            state.done < state.total
                ? `Stopped after ${state.done} of ${state.total} ${plural(state.total)}.`
                : `Game data for ${state.total} ${plural(state.total)} found.`,
        );
    }

    return {
        start,
        stop: () => {
            stopRequested = true;
            wakeOnStop?.();
        },
        state: () => state,
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export const fetchAll = createFetchAll({
    listGames: () => listInstalledGames(),
    prefetch: async (game) => prefetchGameData(game, await getSteamLanguage()),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    notify: (body) => toaster.toast({ title: PLUGIN_NAME, body }),
    delayMs: 1000,
});

export function useFetchAll(): FetchAllState {
    return useSyncExternalStore(fetchAll.subscribe, fetchAll.state);
}
