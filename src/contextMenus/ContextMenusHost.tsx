import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useSettings } from '../data/settings';
import { menuPreferences } from '../menu/preferences';
import { homeCanvas } from '../home/scale';
import { contextMenusOn } from './gate';
import { menuClasses } from './menuClasses';
import { contextMenuCss } from './menuCss';
import { confirmDialogCss } from './confirmCss';
import { applyMenuStyle } from './applyMenuStyle';
import { installGameMenuPatch } from './menuPatch';
import { keepTrying } from './keepTrying';
import { LOOKUP_RETRY_MS } from '../home/moduleLookup';

export const CONTEXT_MENUS_COMPONENT = 'GameGlanceContextMenus';

/** Steam's context menus in the Game Glance look while Restyle Steam's menus is on (spec 2026-11-12-context-menus). */
export function ContextMenusHost({ masterReady }: { masterReady?: Promise<void> } = {}) {
    const master = useSettings(), preferences = useSyncExternalStore(menuPreferences.subscribe, menuPreferences.get),
        load = useSyncExternalStore(menuPreferences.subscribe, menuPreferences.loadState);
    const [ready, setReady] = useState(!masterReady);
    useEffect(() => {
        let live = true;
        setReady(!masterReady);
        masterReady?.then(() => { if (live) setReady(true); }, () => {});
        return () => { live = false; };
    }, [masterReady]);
    const [doc, setDoc] = useState<Document | null>(null), marker = useCallback((e: HTMLSpanElement | null) => { if (e) setDoc(e.ownerDocument); }, []);
    useEffect(() => { if (ready && master.enabled && load === 'unloaded') void menuPreferences.load().catch(() => {}); }, [ready, master.enabled, load]);
    const on = contextMenusOn({ ready, masterEnabled: master.enabled, load, enabled: preferences.enabled, restyle: preferences.restyleSteamSettings });
    return <><span ref={marker} style={{ display: 'none' }}/>{doc && on && <ContextMenusOn doc={doc}/>}</>;
}

function ContextMenusOn({ doc }: { doc: Document }) {
    useEffect(() => {
        const view = doc.defaultView;
        if (!view) return undefined;
        let remove = () => {};
        // True once Steam's class module was found and the rules are in (until then Steam's menus keep their look).
        const apply = () => {
            const css = contextMenuCss(menuClasses());
            // Confirm dialogs use Steam's plain class names: their look needs no class lookup, so it applies at once.
            remove = applyMenuStyle(doc, css + confirmDialogCss(), homeCanvas(view.innerWidth, view.innerHeight).scale);
            return css !== '';
        };
        const stopTrying = keepTrying(apply, LOOKUP_RETRY_MS);
        const onResize = () => { try { apply(); } catch { /* Steam's menus keep their look */ } };
        view.addEventListener('resize', onResize);
        return () => { stopTrying(); view.removeEventListener('resize', onResize); remove(); };
    }, [doc]);
    useEffect(() => {
        let unpatch: (() => void) | null = null;
        const stopTrying = keepTrying(() => Boolean(unpatch = installGameMenuPatch()), LOOKUP_RETRY_MS);
        return () => { stopTrying(); unpatch?.(); };
    }, []);
    return null;
}
