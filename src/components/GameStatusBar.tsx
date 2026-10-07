import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from '../home/StatusBar';
import { statusCss } from '../home/homeCss';
import { homeCanvas } from '../home/scale';
import { findTopBar } from '../home/topBar';

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

/** True while focus is in Steam's own top bar (the bar then fades out, as on Home). Focus anywhere else brings it back. */
function useFocusInTopBar(doc: Document | null): boolean {
    const [away, setAway] = useState(false);
    useEffect(() => {
        if (!doc) return;
        const onFocusIn = (event: Event) => {
            const bar = findTopBar(doc, doc.defaultView?.innerWidth ?? 0);
            const target = event.target as Node | null;
            setAway(!!bar && !!target && bar.contains(target));
        };
        doc.addEventListener('focusin', onFocusIn);
        return () => doc.removeEventListener('focusin', onFocusIn);
    }, [doc]);
    return away;
}

/**
 * True while the page's window does not have focus: Steam's menus (main menu, Quick Access) are separate windows, so one being
 * open takes the focus from the page. Steam's own top bar then shows (sharp over the menu's blur) and ours steps aside. Window
 * focus events are followed by a slow check, since focus can move between windows without one.
 */
function useWindowUnfocused(doc: Document | null): boolean {
    const [unfocused, setUnfocused] = useState(false);
    useEffect(() => {
        if (!doc) return undefined;
        const win = doc.defaultView;
        const update = () => setUnfocused(!doc.hasFocus());
        update();
        win?.addEventListener('focus', update);
        win?.addEventListener('blur', update);
        const timer = setInterval(update, 500);
        return () => {
            win?.removeEventListener('focus', update);
            win?.removeEventListener('blur', update);
            clearInterval(timer);
        };
    }, [doc]);
    return unfocused;
}

/** Above Steam's menu layers (full-screen blurs at 3900), so an open menu does not blur the bar, and below Steam's own top bar (6000). */
const STATUS_Z = 5000;

/**
 * The Spotlight Home status bar on Home and on the game page: the same component, CSS and canvas scale, drawn in a fixed layer over
 * Steam's top strip. It is a portal on the body of the window the page is shown in (found from a marker element placed in
 * the page; the plugin's own `document` is a different window), so the page's transforms and scrolling never move it.
 * `hidden` fades only our bar (Steam's stays covered), for when the page itself runs up under the bar (Home's feed sheet).
 */
export function GameStatusBar({ hidden = false }: { hidden?: boolean }) {
    const [doc, setDoc] = useState<Document | null>(null);
    // A callback ref: the window is known the moment the marker is in the page, with no extra effect pass.
    const marker = useCallback((el: HTMLSpanElement | null) => {
        if (el) setDoc(el.ownerDocument);
    }, []);
    const win = doc?.defaultView ?? null;
    const { width, height } = useViewport(win);
    // Away (ours fades, Steam's top bar shows): focus is in Steam's top bar, or a menu is open over the page.
    const focusInBar = useFocusInTopBar(doc);
    const menuOpen = useWindowUnfocused(doc);
    const away = focusInBar || menuOpen;
    const canvas = homeCanvas(width, height);
    return (
        <>
            <span ref={marker} style={{ display: 'none' }} />
            {doc &&
                createPortal(
                    <div
                        className="gg-status-host"
                        style={{ position: 'fixed', top: 0, right: 0, width: canvas.logicalWidth, height: 0, transformOrigin: 'top right', transform: `scale(${canvas.scale})`, zIndex: STATUS_Z, pointerEvents: 'none', opacity: hidden ? 0 : 1, transition: 'opacity 200ms' }}
                    >
                        <style>{statusCss()}</style>
                        <StatusBar away={away} scale={canvas.scale} />
                    </div>,
                    doc.body,
                )}
        </>
    );
}
