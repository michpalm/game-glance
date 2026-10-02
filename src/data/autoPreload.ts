import { fetchAll } from './fetchAll';
import { settings } from './settings';

export interface AutoPreloadDeps {
    run(): Promise<void>;
    isEnabled(): boolean;
}

const FIRST_RUN_MS = 60_000; // let Steam and the network settle after boot
const EVERY_MS = 30 * 60_000;

/**
 * Pre-loads game data in the background: a minute after the plugin starts, then every 30 minutes.
 * Cached games are skipped without going online, so a run only costs anything when a game is new
 * (or its times are due for a refresh). Returns a function that stops it.
 */
export function startAutoPreload(deps: AutoPreloadDeps = defaultDeps): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = async () => {
        if (deps.isEnabled()) {
            try {
                await deps.run();
            } catch {
                // offline or Steam not ready: try again next time
            }
        }
        if (!stopped) timer = setTimeout(tick, EVERY_MS);
    };
    timer = setTimeout(tick, FIRST_RUN_MS);
    return () => {
        stopped = true;
        clearTimeout(timer);
    };
}

const defaultDeps: AutoPreloadDeps = {
    run: () => fetchAll.start({ quiet: true }),
    isEnabled: () => settings.get().autoPreload,
};
