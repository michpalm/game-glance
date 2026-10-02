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
}

const plural = (n: number) => (n === 1 ? 'game' : 'games');

/** Pre-loads game data (times and descriptions) for every installed game, one at a time. Survives the menu closing. */
export function createFetchAll(deps: FetchAllDeps) {
    let state: FetchAllState = { running: false, done: 0, total: 0, found: 0, notFound: 0 };
    let stopRequested = false;
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
        for (const game of games) {
            let outcome: PrefetchOutcome | null = null;
            try {
                outcome = await deps.prefetch(game);
            } catch {
                outcome = null; // one broken game should not stop the rest
            }
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
