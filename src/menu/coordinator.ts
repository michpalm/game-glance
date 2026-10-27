import type { ReactNode } from 'react';
import type { Entry, MenuEvent, MenuState, Stop } from './model';
import type { HostAttachment, NativeBindings, NativeRequest } from './steam/runtime';

export function createMenuCoordinator(options: { bindings: NativeBindings; getState(): MenuState; dispatch(event: MenuEvent): void; render(): ReactNode }) {
    const { bindings, getState, dispatch, render } = options;
    let host: HostAttachment | null = null;
    let alive = false;
    let generation = 0;
    let frostGeneration = 0, closing = false;
    const releases: Stop[] = [];
    function clearFrost(attached=host):Promise<void>|undefined {
        if(!attached?.clearFrost)return;
        try {
            const pending=attached.clearFrost(frostGeneration);
            return new Promise<void>(resolve=>{
                const timer=setTimeout(resolve,100);
                void pending.then(()=>{clearTimeout(timer);resolve();},()=>{clearTimeout(timer);resolve();});
            });
        }catch{return Promise.resolve();}
    }
    function cleanup(failed = false) {
        if (!alive && !host) return;
        alive = false;
        generation++;
        const attached = host;
        void clearFrost(attached);
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
        closing = true;
        const ticket = ++generation;
        const finish = () => {
            if (!alive || ticket !== generation) return;
            closing = false;
            dispatch({ type: 'close' });
            host?.close();
            bindings.closeMenuHost();
        };
        // Hide the popup before React/native teardown can block a frame or resize
        // the external BrowserView's cached texture.
        const conceal=()=>{
            if(!alive||ticket!==generation)return;
            if (host?.conceal) void host.conceal().then(finish, finish);
            else finish();
        };
        const cleared=clearFrost();if(cleared)void cleared.then(conceal);else conceal();
    };
    async function openWithFallback(entry: Entry, replay: () => void | Promise<void>) {
        if (!alive) return;
        if(closing){closing=false;dispatch({type:'close'});}
        const ticket = ++generation;
        dispatch({ type: 'open', entry });
        if (getState().phase !== 'custom-open') { host?.close(); bindings.closeMenuHost(); return; }
        try {
            frostGeneration=ticket;
            try{host?.setFrostSession?.({generation:ticket,enabled:entry==='quick-access'});}catch{/* Frost cannot fail menu access. */}
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
                releases.push(bindings.subscribeGame(game => {
                    const previous=getState().game;
                    if(getState().phase==='custom-open'&&(previous?.appId!==game?.appId||previous?.gameId!==game?.gameId)){
                        void clearFrost();frostGeneration=++generation;
                        try{host?.setFrostSession?.({generation:frostGeneration,enabled:getState().entry==='quick-access'});}catch{/* Keep glass. */}
                    }
                    dispatch({ type: 'game', value: game });
                }));
                releases.push(bindings.installIntentHandlers({
                    open(entry, replayNative) {
                        if (getState().phase === 'custom-open'&&!closing) { close(); return; }
                        void openWithFallback(entry, replayNative).catch(error => console.warn('[Game Glance] native menu fallback failed', error));
                    },
                    closed() { if (alive) { void clearFrost();generation++;closing=false; dispatch({ type: 'close' }); host?.close(); } },
                    suspended(value) { if (alive && value) { void clearFrost();generation++;closing=false; dispatch({ type: 'handoff' }); host?.suspend(); } },
                }));
                return () => cleanup();
            } catch (error) { cleanup(true); throw error; }
        },
        open(entry: Entry): Promise<void> {
            return openWithFallback(entry, () => bindings.openNative(entry === 'home' ? { kind: 'main-menu' } : { kind: 'qam', tab: 'quick-settings' }));
        },
        async handoff(request: NativeRequest): Promise<void> {
            if (!alive) return;
            const ticket=++generation;closing=false;
            dispatch({ type: 'handoff' });
            const cleared=clearFrost();if(cleared)await cleared;
            if(!alive||generation!==ticket)return;
            host?.suspend();
            await bindings.openNative(request);
        },
        close,
    };
}
