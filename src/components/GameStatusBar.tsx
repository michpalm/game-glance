import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState } from 'react';
import type { HomeStatusControls } from '../home/homeControls';
import { StatusBar } from '../home/StatusBar';
import { statusCss } from '../home/homeCss';
import { homeCanvas } from '../home/scale';
import {useSteamUiState} from '../home/steamUiState';
import { menuOverHome } from '../menu/frost/context';

/** The window's size, kept current. The plugin's code runs in another window than Steam's screen, so it is always `win`'s. */
function useViewport(win: Window | null): { width: number; height: number } {
    const read = () => ({ width: win?.innerWidth ?? 0, height: win?.innerHeight ?? 0 });
    const [size, setSize] = useState(read);
    useEffect(() => {
        if (!win) return;
        const onResize = () => setSize({ width: win.innerWidth, height: win.innerHeight });
        onResize();
        win.addEventListener('resize', onResize);
        return () => win.removeEventListener('resize', onResize);
    }, [win]);
    return size;
}

/** Above Steam's menu layers (full-screen blurs at 3900), so an open menu does not blur the bar, and below Steam's own top bar (6000). */
const STATUS_Z = 5000;

/**
 * The Spotlight Home status bar on Home and on the game page: the same component, CSS and canvas scale, drawn in a fixed layer over
 * Steam's top strip. It is a portal on the body of the window the page is shown in (found from a marker element placed in
 * the page; the plugin's own `document` is a different window), so the page's transforms and scrolling never move it.
 * `hidden` fades only our bar (Steam's stays covered), for when the page itself runs up under the bar (Home's feed sheet).
 */
export function GameStatusBar({ hidden = false, menuOverlay = false, controls, replacement = false }: { hidden?: boolean; menuOverlay?: boolean; controls?: HomeStatusControls; replacement?:boolean }) {
    const [doc, setDoc] = useState<Document | null>(null);
    // A callback ref: the window is known the moment the marker is in the page, with no extra effect pass.
    const marker = useCallback((el: HTMLSpanElement | null) => {
        if (el) setDoc(el.ownerDocument);
    }, []);
    const win = doc?.defaultView ?? null;
    const { width, height } = useViewport(win);
    // Away (ours fades, Steam's top bar shows): focus is in Steam's top bar, or a menu is open over the page.
    const ui = useSteamUiState(doc);
    // A bar inside our custom menu is the foreground copy, not the page copy stepping aside.
    const away = !menuOverlay && (ui.menu || (!replacement && ui.nativeHeaderFocused));
    const canvas = homeCanvas(width, height);
    // On Home the page's own bar stays up under the menu (menu/host holdPageStatus); this copy keeps its place unseen.
    const home = menuOverlay && menuOverHome();
    return (
        <>
            <span ref={marker} style={{ display: 'none' }} />
            {doc &&
                createPortal(
                    <div
                        className={`gg-status-host${menuOverlay ? ' gg-menu-status-host' : ''}${home ? ' gg-menu-status-home' : ''}`}
                        style={{ position: 'fixed', top: 0, right: 0, width: canvas.logicalWidth, height: 0, transformOrigin: 'top right', transform: `scale(${canvas.scale})`, zIndex: STATUS_Z, pointerEvents: 'none', opacity: hidden ? 0 : 1, transition: 'opacity 200ms' }}
                    >
                        <style>{statusCss()}</style>
                        <StatusBar away={away} scale={canvas.scale} controls={!hidden&&!away?controls:undefined} />
                    </div>,
                    doc.body,
                )}
        </>
    );
}
