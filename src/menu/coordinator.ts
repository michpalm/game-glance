import type { ReactNode } from 'react';
import type { Entry, MenuEvent, MenuState, Stop } from './model';
import type { HostAttachment, NativeBindings, NativeRequest } from './steam/runtime';
import { closesSteamMenu } from './steam/routes';

export function createMenuCoordinator(options: { bindings: NativeBindings; getState(): MenuState; dispatch(event: MenuEvent): void; render(): ReactNode }) {
    const { bindings, getState, dispatch, render } = options;
    let host: HostAttachment | null = null;
    let alive = false;
    let generation = 0;
    let frostGeneration = 0, closing = false;
    /** A page that closes Steam's menu is opening: Steam's own deactivate must not turn the closed host back into a suspend. */
    let leaving = false;
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
            try{host?.setFrostSession?.({generation:ticket,enabled:true});}catch{/* Frost cannot fail menu access. */}
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
                    // A game taking focus starts the frost worker, so the first menu
                    // opening fits the reveal hold instead of paying the worker's cold start.
                    if(game&&(previous?.appId!==game.appId||previous?.gameId!==game.gameId)){try{host?.warmFrost?.();}catch{/* Frost stays optional. */}}
                    if(getState().phase==='custom-open'&&(previous?.appId!==game?.appId||previous?.gameId!==game?.gameId)){
                        void clearFrost();frostGeneration=++generation;
                        try{host?.setFrostSession?.({generation:frostGeneration,enabled:true});}catch{/* Keep glass. */}
                    }
                    dispatch({ type: 'game', value: game });
                }));
                releases.push(bindings.installIntentHandlers({
                    open(entry, replayNative) {
                        if (getState().phase === 'custom-open'&&!closing) { close(); return; }
                        void openWithFallback(entry, replayNative).catch(error => console.warn('[Game Glance] native menu fallback failed', error));
                    },
                    closed() { if (alive) { void clearFrost();generation++;closing=false; dispatch({ type: 'close' }); host?.close(); } },
                    suspended(value) { if (alive && value) { void clearFrost();generation++;closing=false; dispatch({ type: 'handoff' }); if (!leaving) host?.suspend(); } },
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
            const leavesSteam=closesSteamMenu(request);
            const cleared=clearFrost();
            // Steam's windows share one thread and the page's first render can hold it for ~400 ms: the popup
            // must have painted the menu away first, or its last frame stays over the page. Capped, like close's frost.
            const hidden=leavesSteam&&host?.conceal?Promise.race([host.conceal().catch(()=>undefined),new Promise(resolve=>setTimeout(resolve,300))]):undefined;
            if(cleared||hidden)await Promise.all([cleared,hidden]);
            if(!alive||generation!==ticket)return;
            // Suspending hands the slot back to Steam's menu, whose 70% black scrim then fades out
            // over the new page; closing keeps it hidden until Steam's menu has closed.
            if(!leavesSteam){host?.suspend();await bindings.openNative(request);return;}
            host?.close();leaving=true;
            try{await bindings.openNative(request);}
            catch(error){if(alive)host?.suspend();throw error;}
            finally{leaving=false;}
        },
        close,
    };
}
