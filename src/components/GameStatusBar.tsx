import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from '../home/StatusBar';
import { statusCss } from '../home/homeCss';
import { homeCanvas } from '../home/scale';
import { menuOpen, steamMenuStore } from '../home/steamMenu';

/** How often the menu state is read (Steam's menu store has no event here); a menu opening shows within this. */
const MENU_POLL_MS = 250;
import { findTopBar, focusInTopBar } from '../home/topBar';

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
        // Read where focus is (topBar.focusInTopBar): on each focus event for an instant answer, and on a short poll,
        // since no focus events arrive while Steam's window has no system focus.
        const update = () => setAway(focusInTopBar(findTopBar(doc, doc.defaultView?.innerWidth ?? 0), doc.activeElement));
        doc.addEventListener('focusin', update);
        const timer = setInterval(update, MENU_POLL_MS);
        return () => {
            doc.removeEventListener('focusin', update);
            clearInterval(timer);
        };
    }, [doc]);
    return away;
}

/**
 * True while one of Steam's menus (main menu, Quick Access) is open, from Steam's own menu store (home/steamMenu): Steam's
 * top bar then shows (sharp over the menu's blur) and ours steps aside. Not the window's focus: when no Steam window has
 * the system's focus at all, that read as a menu open for good and hid the bar. Focus events trigger a read, and a
 * short poll catches the rest.
 */
function useMenuOpen(doc: Document | null): boolean {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!doc) return undefined;
        const win = doc.defaultView;
        const update = () => setOpen(menuOpen(steamMenuStore(), doc.hasFocus()));
        update();
        win?.addEventListener('focus', update);
        win?.addEventListener('blur', update);
        const timer = setInterval(update, MENU_POLL_MS);
        return () => {
            win?.removeEventListener('focus', update);
            win?.removeEventListener('blur', update);
            clearInterval(timer);
        };
    }, [doc]);
    return open;
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
    const menuShown = useMenuOpen(doc);
    const away = focusInBar || menuShown;
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
