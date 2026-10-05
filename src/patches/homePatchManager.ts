import { LOG_PREFIX } from '../constants';

export interface HomePatchDeps {
    isOn(): boolean;
    subscribe(listener: () => void): () => void;
    add(): unknown;
    remove(handle: unknown): void;
}

/**
 * Keeps the Home route patch registered only while Spotlight Home is on, so with the toggle off
 * Steam's Home route is not patched at all. Follows the live setting (including the async initial
 * load). Every dependency call is guarded: a failure leaves the patch off and never throws.
 */
export function createHomePatchManager(deps: HomePatchDeps): { start(): void; stop(): void } {
    let handle: unknown = null;
    let active = false;
    let stopped = false;
    let unsubscribe: (() => void) | null = null;
    let warned = false;

    const warnOnce = (message: string, error: unknown) => {
        if (warned) return;
        warned = true;
        console.warn(`${LOG_PREFIX} ${message}; leaving Steam's Home unchanged`, error);
    };

    const removeActive = () => {
        if (!active) return;
        const current = handle;
        active = false;
        handle = null;
        try {
            deps.remove(current);
        } catch (error) {
            warnOnce('could not remove Home route patch', error);
        }
    };

    const sync = () => {
        try {
            if (stopped) return;
            const on = deps.isOn();
            if (on && !active) {
                handle = deps.add();
                active = true;
            } else if (!on) {
                removeActive();
            }
        } catch (error) {
            warnOnce('Home route patch failed', error);
        }
    };

    return {
        start() {
            stopped = false;
            try {
                unsubscribe ??= deps.subscribe(sync);
            } catch (error) {
                warnOnce('could not follow the Spotlight Home setting', error);
            }
            sync();
        },
        stop() {
            stopped = true;
            try {
                unsubscribe?.();
            } catch {
                // ignore: nothing more to clean up
            }
            unsubscribe = null;
            removeActive();
        },
    };
}
