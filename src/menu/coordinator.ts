import type { ReactNode } from 'react';
import type { Entry, MenuEvent, MenuState, Stop } from './model';
import type { HostAttachment, NativeBindings, NativeRequest } from './steam/runtime';

export function createMenuCoordinator(options: { bindings: NativeBindings; getState(): MenuState; dispatch(event: MenuEvent): void; render(): ReactNode }) {
    const { bindings, getState, dispatch, render } = options;
    let host: HostAttachment | null = null;
    let alive = false;
    let generation = 0;
    const releases: Stop[] = [];
    function cleanup(failed = false) {
        if (!alive && !host) return;
        alive = false;
        generation++;
        const attached = host;
        host = null;
        const closeNative = getState().phase === 'custom-open';
        const steps: Stop[] = [() => attached?.close(), ...(closeNative ? [() => bindings.closeMenuHost()] : []), ...releases.splice(0).reverse(), () => attached?.dispose()];
        for (const release of steps) {
            try { release(); } catch (error) { console.warn('[Game Glance] menu cleanup failed', error); }
        }
        dispatch(failed ? { type: 'failure' } : { type: 'enable', value: false });
    }
    const close = () => {
        if (!alive) return;
        dispatch({ type: 'close' });
        generation++;
        host?.close();
        bindings.closeMenuHost();
    };
    async function openWithFallback(entry: Entry, replay: () => void | Promise<void>) {
        if (!alive) return;
        const ticket = ++generation;
        dispatch({ type: 'open', entry });
        if (getState().phase !== 'custom-open') { host?.close(); bindings.closeMenuHost(); return; }
        try {
            const presented = host?.present(render());
            void presented?.catch(() => undefined); // Activation can throw before the await; cleanup may then reject presentation.
            bindings.showMenuHost(); // Steam must render the native surface before its portal can acknowledge content.
            await presented;
        } catch {
            if (!alive || ticket !== generation) return;
            cleanup(true);
            await replay();
        }
    }
    return {
        start(): Stop {
            if (alive) return () => cleanup();
            if (getState().phase === 'disabled' || getState().phase === 'failed') return () => undefined;
            alive = true;
            try {
                host = bindings.attachHost(() => render());
                if (host.onFailure) releases.push(host.onFailure(() => {
                    if (!alive) return;
                    const entry = getState().entry;
                    cleanup(true);
                    void bindings.openNative(entry === 'home' ? { kind: 'main-menu' } : { kind: 'qam', tab: 'quick-settings' }).catch(error => console.warn('[Game Glance] native menu recovery failed', error));
                }));
                releases.push(bindings.subscribeGame(game => dispatch({ type: 'game', value: game })));
                releases.push(bindings.installIntentHandlers({
                    open(entry, replayNative) { void openWithFallback(entry, replayNative).catch(error => console.warn('[Game Glance] native menu fallback failed', error)); },
                    closed() { if (alive) { generation++; dispatch({ type: 'close' }); host?.close(); } },
                    suspended(value) { if (alive && value) { generation++; dispatch({ type: 'handoff' }); host?.suspend(); } },
                }));
                return () => cleanup();
            } catch (error) { cleanup(true); throw error; }
        },
        open(entry: Entry): Promise<void> {
            return openWithFallback(entry, () => bindings.openNative(entry === 'home' ? { kind: 'main-menu' } : { kind: 'qam', tab: 'quick-settings' }));
        },
        async handoff(request: NativeRequest): Promise<void> {
            if (!alive) return;
            generation++;
            dispatch({ type: 'handoff' });
            host?.suspend();
            await bindings.openNative(request);
        },
        close,
    };
}
