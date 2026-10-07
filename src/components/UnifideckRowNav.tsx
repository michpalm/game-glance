import { useEffect, useRef, useState } from 'react';
import { LOG_PREFIX } from '../constants';
import { needsVisualNav, visualNeighbour } from '../logic/rowNav';

const PRIMARY = ['.unifideck-play-btn', '.unifideck-install-btn', '.unifideck-resume-btn', '.unifideck-update-btn', '.unifideck-cancel-btn'].join(', ');
const LEFT = 11;
const RIGHT = 12;

/** Unifideck's Play row around `target` (the element holding its primary button and the circles), or null. */
function playRow(target: Element | null): Element | null {
    for (let el = target; el && el.parentElement; el = el.parentElement) {
        if (el.querySelector(`:scope > :is(${PRIMARY})`)) return el;
    }
    return null;
}

/**
 * Left/Right on Unifideck's row follow the buttons' positions: the theme moves its cloud button after the settings button
 * (CSS `order`), while Steam steps through a row in DOM order, which would jump around the picture. Only acts when the
 * row's positions differ from its DOM order; otherwise Steam's own stepping stays. Lives in the page's window (found from
 * a marker element: the plugin's own `document` is another window).
 */
export function UnifideckRowNav() {
    const marker = useRef<HTMLSpanElement>(null);
    const [doc, setDoc] = useState<Document | null>(null);
    useEffect(() => setDoc(marker.current?.ownerDocument ?? null), []);
    useEffect(() => {
        if (!doc) return undefined;
        const onDirection = (event: Event) => {
            try {
                const button = Number((event as CustomEvent<{ button?: unknown }>).detail?.button);
                if (button !== LEFT && button !== RIGHT) return;
                const target = event.target as Element | null;
                const row = playRow(target);
                if (!row) return;
                const items = [...row.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled && b.getBoundingClientRect().width > 0);
                const xs = items.map((b) => b.getBoundingClientRect().x);
                if (!needsVisualNav(xs)) return;
                const from = items.findIndex((b) => b === target || b.contains(target));
                if (from < 0) return;
                event.stopPropagation();
                event.preventDefault();
                const next = visualNeighbour(xs, from, button === RIGHT ? 'right' : 'left');
                if (next !== null) items[next].focus();
            } catch (error) {
                console.warn(`${LOG_PREFIX} Unifideck row navigation failed`, error);
            }
        };
        doc.addEventListener('vgp_ondirection', onDirection, true);
        return () => doc.removeEventListener('vgp_ondirection', onDirection, true);
    }, [doc]);
    return <span ref={marker} style={{ display: 'none' }} />;
}
